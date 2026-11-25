/**
 * Query executor.
 *
 * Evaluates a parsed statement against an in-memory database. The pipeline
 * follows SQL's logical processing order, which is exactly the order the
 * lessons teach:
 *
 *   FROM / JOIN -> WHERE -> GROUP BY -> HAVING -> window functions ->
 *   SELECT -> DISTINCT -> ORDER BY -> LIMIT / OFFSET
 *
 * Every table is a plain array of rows held in memory, so a query can touch
 * nothing outside the dataset it was handed: there is no filesystem, no
 * network and no shared mutable state to reach.
 */

import type {
  Cte,
  DeleteStmt,
  Expr,
  FromItem,
  InsertStmt,
  OrderItem,
  SelectStmt,
  SqlValue,
  Statement,
  UpdateStmt,
  WindowSpec,
} from './ast';
import { SqlError } from './tokens';
import {
  AGGREGATE_NAMES,
  callScalar,
  isAggregate,
  isScalarFunction,
  isWindowOnly,
} from './functions';
import {
  and3,
  castValue,
  compareValues,
  groupKey,
  isNull,
  isTruthy,
  likeToRegExp,
  not3,
  or3,
  orderCompare,
  toBool,
  toNumber,
  toText,
  type Bool3,
} from './values';

/* ------------------------------------------------------------------ types */

export type SqlColumnType = 'integer' | 'numeric' | 'text' | 'date' | 'boolean';

export interface ColumnRef {
  /** Table or alias the column came from; null for computed columns. */
  table: string | null;
  name: string;
  /** Declared type, when the column came from a dataset table. */
  type?: SqlColumnType;
}

export interface Relation {
  schema: ColumnRef[];
  rows: SqlValue[][];
}

export interface ResultSet {
  columns: string[];
  rows: SqlValue[][];
  /** Rows changed by INSERT / UPDATE / DELETE; null for a SELECT. */
  rowsAffected: number | null;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface TableData {
  name: string;
  columns: string[];
  /** Declared type per column, parallel to `columns`. */
  columnTypes: SqlColumnType[];
  rows: SqlValue[][];
}

export interface Database {
  tables: Map<string, TableData>;
}

export interface ExecuteLimits {
  /** Abort once this many internal steps have been taken. */
  maxSteps: number;
  /** Abort if a single relation exceeds this many rows. */
  maxRows: number;
  /** Wall-clock ceiling, checked periodically. */
  timeoutMs: number;
}

export const DEFAULT_LIMITS: ExecuteLimits = {
  maxSteps: 2_000_000,
  maxRows: 100_000,
  timeoutMs: 2000,
};

interface Scope {
  schema: ColumnRef[];
  row: SqlValue[];
  parent: Scope | null;
}

interface EvalContext {
  scope: Scope | null;
  /** Rows of the current group, when an aggregate may be evaluated. */
  groupRows: SqlValue[][] | null;
  /** Schema the group rows are shaped by. */
  groupSchema: ColumnRef[] | null;
  /** Pre-computed window-function results for the current output row. */
  windowValues: Map<Expr, SqlValue> | null;
  /** Expressions that GROUP BY makes legal to reference bare. */
  groupedExprs: Expr[] | null;
  /** Structural keys of those expressions, for whole-subtree matching. */
  groupedKeys: Set<string> | null;
}

class Budget {
  private steps = 0;
  private readonly deadline: number;
  private readonly limits: ExecuteLimits;

  constructor(limits: ExecuteLimits) {
    this.limits = limits;
    this.deadline = Date.now() + limits.timeoutMs;
  }

  tick(n = 1): void {
    this.steps += n;
    if (this.steps > this.limits.maxSteps) {
      throw new SqlError(
        'Query stopped: it did too much work. Check for a missing join condition causing a huge cross product.'
      );
    }
    // Date.now() is relatively costly, so only sample it.
    if ((this.steps & 0x3fff) === 0 && Date.now() > this.deadline) {
      throw new SqlError(`Query stopped after ${this.limits.timeoutMs}ms. It is taking too long.`);
    }
  }

  guardRows(count: number): void {
    if (count > this.limits.maxRows) {
      throw new SqlError(
        `Query stopped: it produced more than ${this.limits.maxRows} rows. Check the join conditions.`
      );
    }
  }
}

/* ------------------------------------------------------------- executor */

class Executor {
  private readonly cteStack: Map<string, Relation>[] = [];
  private readonly db: Database;
  private readonly budget: Budget;

  constructor(db: Database, budget: Budget) {
    this.db = db;
    this.budget = budget;
  }

  /* ---------------------------------------------------------- statements */

  run(stmt: Statement): ResultSet {
    switch (stmt.type) {
      case 'select': {
        const relation = this.execSelect(stmt, null);
        return {
          columns: relation.schema.map((c) => c.name),
          rows: relation.rows,
          rowsAffected: null,
          command: 'SELECT',
        };
      }
      case 'insert':
        return this.execInsert(stmt);
      case 'update':
        return this.execUpdate(stmt);
      case 'delete':
        return this.execDelete(stmt);
    }
  }

  private table(name: string): TableData {
    const t = this.db.tables.get(name.toLowerCase());
    if (!t) {
      const known = [...this.db.tables.keys()].sort().join(', ');
      throw new SqlError(`Table "${name}" does not exist. Available tables: ${known || 'none'}`);
    }
    return t;
  }

  /* --------------------------------------------------------------- CTEs */

  private lookupCte(name: string): Relation | null {
    for (let i = this.cteStack.length - 1; i >= 0; i--) {
      const found = (this.cteStack[i] as Map<string, Relation>).get(name.toLowerCase());
      if (found) return found;
    }
    return null;
  }

  private withCtes<T>(ctes: Cte[], outer: Scope | null, body: () => T): T {
    if (ctes.length === 0) return body();

    const frame = new Map<string, Relation>();
    this.cteStack.push(frame);
    try {
      for (const cte of ctes) {
        frame.set(cte.name.toLowerCase(), this.materialiseCte(cte, outer, frame));
      }
      return body();
    } finally {
      this.cteStack.pop();
    }
  }

  /**
   * A recursive CTE runs its non-recursive arm once, then repeats the
   * recursive arm against only the rows added by the previous round until no
   * new rows appear. The iteration cap is what stops a missing termination
   * condition from hanging the page.
   */
  private materialiseCte(cte: Cte, outer: Scope | null, frame: Map<string, Relation>): Relation {
    const applyNames = (rel: Relation): Relation => {
      if (!cte.columns) {
        return { schema: rel.schema.map((c) => ({ ...c, table: cte.name })), rows: rel.rows };
      }
      if (cte.columns.length !== rel.schema.length) {
        throw new SqlError(
          `CTE "${cte.name}" declares ${cte.columns.length} column(s) but its query returns ${rel.schema.length}`
        );
      }
      return {
        schema: cte.columns.map((name) => ({ table: cte.name, name })),
        rows: rel.rows,
      };
    };

    if (!cte.recursive || !cte.select.setOp || cte.select.setOp.op !== 'union') {
      return applyNames(this.execSelect(cte.select, outer));
    }

    const seed = { ...cte.select, setOp: null };
    const recursive = cte.select.setOp.right;
    const all = cte.select.setOp.all;

    let accumulated = applyNames(this.execSelect(seed, outer));
    const seen = new Set(accumulated.rows.map((r) => groupKey(r)));
    let working = accumulated;

    for (let round = 0; round < 1000; round++) {
      if (working.rows.length === 0) break;
      // The recursive arm sees only the previous round's output.
      frame.set(cte.name.toLowerCase(), working);
      const produced = applyNames(this.execSelect(recursive, outer));

      const fresh: SqlValue[][] = [];
      for (const row of produced.rows) {
        this.budget.tick();
        if (all) {
          fresh.push(row);
        } else {
          const key = groupKey(row);
          if (!seen.has(key)) {
            seen.add(key);
            fresh.push(row);
          }
        }
      }

      if (fresh.length === 0) break;
      accumulated = { schema: accumulated.schema, rows: [...accumulated.rows, ...fresh] };
      this.budget.guardRows(accumulated.rows.length);
      working = { schema: accumulated.schema, rows: fresh };

      if (round === 999) {
        throw new SqlError(
          `Recursive CTE "${cte.name}" did not terminate within 1000 iterations. Check its stopping condition.`
        );
      }
    }

    frame.set(cte.name.toLowerCase(), accumulated);
    return accumulated;
  }

  /* ------------------------------------------------------------- SELECT */

  execSelect(stmt: SelectStmt, outer: Scope | null): Relation {
    return this.withCtes(stmt.ctes, outer, () => {
      let relation = this.execSelectCore(stmt, outer);

      if (stmt.setOp) {
        const right = this.execSelect(stmt.setOp.right, outer);
        relation = this.applySetOp(relation, right, stmt.setOp.op, stmt.setOp.all);
        // ORDER BY / LIMIT attached to a set operation apply to the whole thing.
        relation = this.applyOrderLimitOnOutput(relation, stmt, outer);
      }

      return relation;
    });
  }

  /** One SELECT term, without its set operation. */
  private execSelectCore(stmt: SelectStmt, outer: Scope | null): Relation {
    if (stmt.values) return this.execValues(stmt, outer);

    /* -------- FROM / JOIN -------- */
    const base: Relation = stmt.from
      ? this.execFrom(stmt.from, outer)
      : { schema: [], rows: [[]] };

    /* -------- WHERE -------- */
    const filtered: SqlValue[][] = [];
    for (const row of base.rows) {
      this.budget.tick();
      if (!stmt.where) {
        filtered.push(row);
        continue;
      }
      const ctx = this.rowContext(base.schema, row, outer);
      if (isTruthy(this.evalBool(stmt.where, ctx))) filtered.push(row);
    }

    /* -------- GROUP BY / aggregates -------- */
    const selectExprs = stmt.columns.map((c) => c.expr);

    // PostgreSQL lets GROUP BY name an output alias, which is how
    // `GROUP BY band` works for a CASE expression labelled `AS band`.
    const aliasMap = new Map<string, Expr>();
    for (const item of stmt.columns) {
      if (item.alias) aliasMap.set(item.alias, item.expr);
    }
    const groupBy = stmt.groupBy.map((e) => {
      if (e.kind === 'column' && e.table === null) {
        const aliased = aliasMap.get(e.name);
        // An alias only wins when there is no real column of that name.
        if (aliased && !base.schema.some((c) => c.name === e.name)) return aliased;
      }
      return e;
    });
    const needsGrouping =
      groupBy.length > 0 ||
      selectExprs.some((e) => containsAggregate(e)) ||
      (stmt.having !== null && containsAggregate(stmt.having));

    interface OutputRow {
      row: SqlValue[];
      groupRows: SqlValue[][] | null;
      windowValues: Map<Expr, SqlValue>;
    }

    let outputRows: OutputRow[];

    if (!needsGrouping) {
      outputRows = filtered.map((row) => ({ row, groupRows: null, windowValues: new Map() }));
    } else if (groupBy.length === 0) {
      // An aggregate with no GROUP BY collapses everything to one row — and
      // still produces that row when the table is empty (COUNT(*) = 0).
      const representative = filtered[0] ?? base.schema.map(() => null);
      outputRows = [{ row: representative, groupRows: filtered, windowValues: new Map() }];
    } else {
      const groups = new Map<string, SqlValue[][]>();
      const order: string[] = [];
      for (const row of filtered) {
        this.budget.tick();
        const ctx = this.rowContext(base.schema, row, outer);
        const key = groupKey(groupBy.map((e) => this.evalExpr(e, ctx)));
        const bucket = groups.get(key);
        if (bucket) bucket.push(row);
        else {
          groups.set(key, [row]);
          order.push(key);
        }
      }
      outputRows = order.map((key) => {
        const rows = groups.get(key) as SqlValue[][];
        return { row: rows[0] as SqlValue[], groupRows: rows, windowValues: new Map() };
      });
    }

    const groupedExprs = needsGrouping ? groupBy : null;
    // Matching a whole grouping expression lifts the bare-column restriction
    // inside it, so `GROUP BY <case expr>` lets the same CASE appear in SELECT.
    const groupedKeys = groupedExprs ? new Set(groupedExprs.map(exprKey)) : null;

    const contextFor = (o: OutputRow): EvalContext => ({
      scope: { schema: base.schema, row: o.row, parent: outer },
      groupRows: o.groupRows,
      groupSchema: o.groupRows ? base.schema : null,
      windowValues: o.windowValues,
      groupedExprs,
      groupedKeys,
    });

    /* -------- HAVING -------- */
    if (stmt.having) {
      outputRows = outputRows.filter((o) => {
        this.budget.tick();
        return isTruthy(this.evalBool(stmt.having as Expr, contextFor(o)));
      });
    }

    /* -------- window functions -------- */
    const windowCalls = collectWindowCalls([
      ...selectExprs,
      ...stmt.orderBy.map((o) => o.expr),
      ...(stmt.distinctOn ?? []),
    ]);
    for (const call of windowCalls) {
      this.computeWindow(call, outputRows, contextFor);
    }

    /* -------- SELECT list -------- */
    const projected = this.expandSelectList(stmt.columns, base.schema);

    const schema: ColumnRef[] = projected.map((item) => {
      const inherited =
        item.expr.kind === 'column'
          ? base.schema.find(
              (c) =>
                c.name === (item.expr as { name: string }).name &&
                ((item.expr as { table: string | null }).table === null ||
                  c.table === (item.expr as { table: string | null }).table)
            )?.type
          : undefined;
      const type = inherited ?? this.staticType(item.expr, base.schema);
      if (item.alias) return { table: null, name: item.alias, ...(type ? { type } : {}) };
      if (item.expr.kind === 'column') {
        return { table: item.expr.table, name: item.expr.name, ...(type ? { type } : {}) };
      }
      return { table: null, name: deriveColumnName(item.expr), ...(type ? { type } : {}) };
    });

    let rows: SqlValue[][] = outputRows.map((o) => {
      this.budget.tick();
      const ctx = contextFor(o);
      return projected.map((item) => this.evalExpr(item.expr, ctx));
    });

    /* -------- DISTINCT -------- */
    if (stmt.distinctOn) {
      // DISTINCT ON keeps the first row of each key, which only makes sense
      // once ORDER BY has run — so order first, then dedupe, then re-order.
      const withKeys = outputRows.map((o, i) => ({
        key: groupKey((stmt.distinctOn as Expr[]).map((e) => this.evalExpr(e, contextFor(o)))),
        row: rows[i] as SqlValue[],
        output: o,
      }));
      const ordered =
        stmt.orderBy.length > 0
          ? this.sortPairs(withKeys, stmt.orderBy, schema, contextFor, (p) => p.row)
          : withKeys;
      const seen = new Set<string>();
      const kept = ordered.filter((p) => {
        if (seen.has(p.key)) return false;
        seen.add(p.key);
        return true;
      });
      rows = kept.map((p) => p.row);
      return this.applyLimitOffset({ schema, rows }, stmt, outer);
    }

    if (stmt.distinct) {
      const seen = new Set<string>();
      const deduped: SqlValue[][] = [];
      const keptOutputs: OutputRow[] = [];
      rows.forEach((row, i) => {
        const key = groupKey(row);
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(row);
        keptOutputs.push(outputRows[i] as OutputRow);
      });
      rows = deduped;
      outputRows = keptOutputs;
    }

    /* -------- ORDER BY -------- */
    if (stmt.orderBy.length > 0) {
      const pairs = rows.map((row, i) => ({ row, output: outputRows[i] as OutputRow }));
      const sorted = this.sortPairs(pairs, stmt.orderBy, schema, contextFor, (p) => p.row);
      rows = sorted.map((p) => p.row);
    }

    return this.applyLimitOffset({ schema, rows }, stmt, outer);
  }

  private execValues(stmt: SelectStmt, outer: Scope | null): Relation {
    const valueRows = stmt.values as Expr[][];
    const width = (valueRows[0] as Expr[]).length;
    const ctx: EvalContext = {
      scope: outer,
      groupRows: null,
      groupSchema: null,
      windowValues: null,
      groupedExprs: null,
      groupedKeys: null,
    };
    const rows = valueRows.map((row) => {
      if (row.length !== width) {
        throw new SqlError('Every VALUES row must have the same number of columns');
      }
      return row.map((e) => this.evalExpr(e, ctx));
    });
    const schema: ColumnRef[] = Array.from({ length: width }, (_, i) => ({
      table: null,
      name: 'column' + (i + 1),
    }));
    return this.applyLimitOffset({ schema, rows }, stmt, outer);
  }

  /**
   * ORDER BY resolution, in PostgreSQL's precedence: an output column alias
   * wins, then a 1-based ordinal, then an expression over the input row.
   */
  private sortPairs<T>(
    pairs: T[],
    orderBy: OrderItem[],
    schema: ColumnRef[],
    contextFor: (o: { groupRows: SqlValue[][] | null; row: SqlValue[]; windowValues: Map<Expr, SqlValue> }) => EvalContext,
    getRow: (p: T) => SqlValue[]
  ): T[] {
    const keyed = pairs.map((p) => {
      const row = getRow(p);
      const output = (p as unknown as { output: { groupRows: SqlValue[][] | null; row: SqlValue[]; windowValues: Map<Expr, SqlValue> } }).output;
      const keys = orderBy.map((item) => {
        // An output-column alias takes precedence over an input column.
        const target = item.expr;
        if (target.kind === 'column' && target.table === null) {
          const aliasIndex = schema.findIndex((c) => c.name === target.name);
          if (aliasIndex >= 0) return row[aliasIndex] as SqlValue;
        }
        if (item.expr.kind === 'literal' && typeof item.expr.value === 'number') {
          const ordinal = Math.trunc(item.expr.value);
          if (ordinal < 1 || ordinal > schema.length) {
            throw new SqlError(`ORDER BY position ${ordinal} is not in the select list`);
          }
          return row[ordinal - 1] as SqlValue;
        }
        return this.evalExpr(item.expr, contextFor(output));
      });
      return { pair: p, keys };
    });

    keyed.sort((a, b) => {
      for (let i = 0; i < orderBy.length; i++) {
        const item = orderBy[i] as OrderItem;
        const cmp = orderCompare(
          a.keys[i] as SqlValue,
          b.keys[i] as SqlValue,
          item.direction,
          item.nulls
        );
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    return keyed.map((k) => k.pair);
  }

  private applyOrderLimitOnOutput(
    relation: Relation,
    stmt: SelectStmt,
    outer: Scope | null
  ): Relation {
    let rows = relation.rows;

    if (stmt.orderBy.length > 0) {
      const keyed = rows.map((row) => ({
        row,
        keys: stmt.orderBy.map((item) => {
          const target = item.expr;
          if (target.kind === 'column' && target.table === null) {
            const idx = relation.schema.findIndex((c) => c.name === target.name);
            if (idx >= 0) return row[idx] as SqlValue;
          }
          if (target.kind === 'literal' && typeof target.value === 'number') {
            const ordinal = Math.trunc(target.value);
            if (ordinal < 1 || ordinal > relation.schema.length) {
              throw new SqlError(`ORDER BY position ${ordinal} is not in the select list`);
            }
            return row[ordinal - 1] as SqlValue;
          }
          const ctx = this.rowContext(relation.schema, row, outer);
          return this.evalExpr(item.expr, ctx);
        }),
      }));
      keyed.sort((a, b) => {
        for (let i = 0; i < stmt.orderBy.length; i++) {
          const item = stmt.orderBy[i] as OrderItem;
          const cmp = orderCompare(
            a.keys[i] as SqlValue,
            b.keys[i] as SqlValue,
            item.direction,
            item.nulls
          );
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      rows = keyed.map((k) => k.row);
    }

    return this.applyLimitOffset({ schema: relation.schema, rows }, stmt, outer);
  }

  private applyLimitOffset(relation: Relation, stmt: SelectStmt, outer: Scope | null): Relation {
    if (!stmt.limit && !stmt.offset) return relation;
    const ctx: EvalContext = {
      scope: outer,
      groupRows: null,
      groupSchema: null,
      windowValues: null,
      groupedExprs: null,
      groupedKeys: null,
    };

    let rows = relation.rows;
    if (stmt.offset) {
      const n = toNumber(this.evalExpr(stmt.offset, ctx), 'an OFFSET');
      if (n !== null) {
        if (n < 0) throw new SqlError('OFFSET must not be negative');
        rows = rows.slice(Math.trunc(n));
      }
    }
    if (stmt.limit) {
      const n = toNumber(this.evalExpr(stmt.limit, ctx), 'a LIMIT');
      if (n !== null) {
        if (n < 0) throw new SqlError('LIMIT must not be negative');
        rows = rows.slice(0, Math.trunc(n));
      }
    }
    return { schema: relation.schema, rows };
  }

  private applySetOp(
    left: Relation,
    right: Relation,
    op: 'union' | 'intersect' | 'except',
    all: boolean
  ): Relation {
    if (left.schema.length !== right.schema.length) {
      throw new SqlError(
        `Both sides of ${op.toUpperCase()} must have the same number of columns (${left.schema.length} vs ${right.schema.length})`
      );
    }

    const keyOf = (row: SqlValue[]) => groupKey(row);

    if (op === 'union') {
      const rows = [...left.rows, ...right.rows];
      this.budget.guardRows(rows.length);
      return { schema: left.schema, rows: all ? rows : dedupe(rows, keyOf) };
    }

    if (op === 'intersect') {
      const counts = new Map<string, number>();
      for (const row of right.rows) {
        const k = keyOf(row);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const out: SqlValue[][] = [];
      for (const row of left.rows) {
        const k = keyOf(row);
        const available = counts.get(k) ?? 0;
        if (available > 0) {
          out.push(row);
          if (all) counts.set(k, available - 1);
        }
      }
      return { schema: left.schema, rows: all ? out : dedupe(out, keyOf) };
    }

    // EXCEPT
    const counts = new Map<string, number>();
    for (const row of right.rows) {
      const k = keyOf(row);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const out: SqlValue[][] = [];
    for (const row of left.rows) {
      const k = keyOf(row);
      const blocked = counts.get(k) ?? 0;
      if (blocked > 0) {
        if (all) counts.set(k, blocked - 1);
        continue;
      }
      out.push(row);
    }
    return { schema: left.schema, rows: all ? out : dedupe(out, keyOf) };
  }

  private expandSelectList(
    items: { expr: Expr; alias: string | null }[],
    schema: ColumnRef[]
  ): { expr: Expr; alias: string | null }[] {
    const out: { expr: Expr; alias: string | null }[] = [];
    for (const item of items) {
      if (item.expr.kind !== 'star') {
        out.push(item);
        continue;
      }
      const table = item.expr.table;
      const matched = schema.filter((c) => table === null || c.table === table);
      if (matched.length === 0) {
        throw new SqlError(
          table ? `No table or alias named "${table}" in the FROM clause` : 'SELECT * needs a FROM clause'
        );
      }
      for (const col of matched) {
        out.push({ expr: { kind: 'column', table: col.table, name: col.name }, alias: col.name });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- FROM */

  private execFrom(item: FromItem, outer: Scope | null): Relation {
    if (item.kind === 'table') {
      const cte = this.lookupCte(item.name);
      const alias = item.alias ?? item.name.toLowerCase();
      if (cte) {
        return {
          schema: cte.schema.map((c) => ({ ...c, table: alias })),
          rows: cte.rows,
        };
      }
      const table = this.table(item.name);
      return {
        schema: table.columns.map((name, i) => ({
          table: alias,
          name,
          type: table.columnTypes[i] as SqlColumnType,
        })),
        rows: table.rows,
      };
    }

    if (item.kind === 'subquery') {
      const rel = this.execSelect(item.select, outer);
      return {
        schema: rel.schema.map((c) => ({ ...c, table: item.alias })),
        rows: rel.rows,
      };
    }

    return this.execJoin(item, outer);
  }

  private execJoin(
    item: Extract<FromItem, { kind: 'join' }>,
    outer: Scope | null
  ): Relation {
    const left = this.execFrom(item.left, outer);
    const right = this.execFrom(item.right, outer);
    const joinedSchema = [...left.schema, ...right.schema];
    const nullsRight = right.schema.map(() => null as SqlValue);
    const nullsLeft = left.schema.map(() => null as SqlValue);

    // USING (a, b) is sugar for an equality ON, and merges the named columns.
    let condition: Expr | null = item.on;
    if (item.using) {
      for (const name of item.using) {
        if (!left.schema.some((c) => c.name === name) || !right.schema.some((c) => c.name === name)) {
          throw new SqlError(`USING column "${name}" must exist on both sides of the join`);
        }
      }
      condition = item.using
        .map<Expr>((name) => ({
          kind: 'binary',
          op: '=',
          left: { kind: 'column', table: leftTableOf(left.schema, name), name },
          right: { kind: 'column', table: leftTableOf(right.schema, name), name },
        }))
        .reduce((acc, e) => ({ kind: 'binary', op: 'and', left: acc, right: e }));
    }

    const matches = (lrow: SqlValue[], rrow: SqlValue[]): boolean => {
      this.budget.tick();
      if (!condition) return true;
      const ctx = this.rowContext(joinedSchema, [...lrow, ...rrow], outer);
      return isTruthy(this.evalBool(condition, ctx));
    };

    const rows: SqlValue[][] = [];
    const rightMatched = new Set<number>();

    if (item.joinType === 'cross') {
      this.budget.guardRows(left.rows.length * right.rows.length);
      for (const lrow of left.rows) {
        for (const rrow of right.rows) {
          this.budget.tick();
          rows.push([...lrow, ...rrow]);
        }
      }
    } else {
      for (const lrow of left.rows) {
        let found = false;
        for (let ri = 0; ri < right.rows.length; ri++) {
          const rrow = right.rows[ri] as SqlValue[];
          if (matches(lrow, rrow)) {
            rows.push([...lrow, ...rrow]);
            rightMatched.add(ri);
            found = true;
          }
        }
        if (!found && (item.joinType === 'left' || item.joinType === 'full')) {
          rows.push([...lrow, ...nullsRight]);
        }
        this.budget.guardRows(rows.length);
      }

      if (item.joinType === 'right' || item.joinType === 'full') {
        for (let ri = 0; ri < right.rows.length; ri++) {
          if (rightMatched.has(ri)) continue;
          rows.push([...nullsLeft, ...(right.rows[ri] as SqlValue[])]);
        }
      }
    }

    if (!item.using) return { schema: joinedSchema, rows };

    // Merge the USING columns into a single unqualified column each, which is
    // what makes `SELECT *` on a USING join show them once.
    const usingNames = item.using;
    const leftIdx = usingNames.map((n) => left.schema.findIndex((c) => c.name === n));
    const rightIdx = usingNames.map((n) => right.schema.findIndex((c) => c.name === n) + left.schema.length);

    const keepLeft = left.schema.map((_, i) => i).filter((i) => !leftIdx.includes(i));
    const keepRight = right.schema
      .map((_, i) => i + left.schema.length)
      .filter((i) => !rightIdx.includes(i));

    const mergedSchema: ColumnRef[] = [
      ...usingNames.map((name) => ({ table: null, name })),
      ...keepLeft.map((i) => joinedSchema[i] as ColumnRef),
      ...keepRight.map((i) => joinedSchema[i] as ColumnRef),
    ];

    const mergedRows = rows.map((row) => [
      ...usingNames.map((_, k) => {
        const lv = row[leftIdx[k] as number] as SqlValue;
        return isNull(lv) ? (row[rightIdx[k] as number] as SqlValue) : lv;
      }),
      ...keepLeft.map((i) => row[i] as SqlValue),
      ...keepRight.map((i) => row[i] as SqlValue),
    ]);

    return { schema: mergedSchema, rows: mergedRows };
  }

  /* ------------------------------------------------------ static typing */

  /**
   * Best-effort type of an expression, from declared column types and literal
   * spelling. Only `/` depends on it, to reproduce PostgreSQL's integer
   * division: `7 / 2` is 3, but `7.0 / 2` is 3.5. When the type cannot be
   * determined the result is undefined, and division stays exact — erring
   * towards the mathematically correct answer rather than a silent truncation.
   */
  private staticType(expr: Expr, schema: ColumnRef[]): SqlColumnType | undefined {
    switch (expr.kind) {
      case 'literal':
        if (expr.value === null) return undefined;
        if (typeof expr.value === 'boolean') return 'boolean';
        if (typeof expr.value === 'string') return 'text';
        return expr.isFloat || !Number.isInteger(expr.value) ? 'numeric' : 'integer';

      case 'column': {
        const match = schema.find(
          (c) => c.name === expr.name && (expr.table === null || c.table === expr.table)
        );
        return match?.type;
      }

      case 'cast': {
        const t = expr.to.toLowerCase();
        if (['int', 'integer', 'bigint', 'smallint', 'int4', 'int8'].includes(t)) return 'integer';
        if (['numeric', 'decimal', 'real', 'double precision', 'float', 'float8'].includes(t)) {
          return 'numeric';
        }
        if (['text', 'varchar', 'char', 'character varying'].includes(t)) return 'text';
        if (t === 'date') return 'date';
        if (['bool', 'boolean'].includes(t)) return 'boolean';
        return undefined;
      }

      case 'unary':
        return expr.op === 'not' ? 'boolean' : this.staticType(expr.operand, schema);

      case 'binary': {
        if (['and', 'or', '=', '<>', '<', '>', '<=', '>='].includes(expr.op)) return 'boolean';
        if (expr.op === '||') return 'text';
        const a = this.staticType(expr.left, schema);
        const b = this.staticType(expr.right, schema);
        if (a === 'numeric' || b === 'numeric') return 'numeric';
        if (a === 'integer' && b === 'integer') return 'integer';
        return undefined;
      }

      case 'func': {
        if (expr.name === 'count' || expr.name === 'row_number') return 'integer';
        if (['rank', 'dense_rank', 'ntile'].includes(expr.name)) return 'integer';
        if (['avg', 'percent_rank', 'cume_dist'].includes(expr.name)) return 'numeric';
        if (['sum', 'min', 'max', 'coalesce', 'lag', 'lead', 'first_value', 'last_value'].includes(expr.name)) {
          const arg = expr.args[0];
          return arg && arg.kind !== 'star' ? this.staticType(arg, schema) : undefined;
        }
        if (['round', 'abs', 'ceil', 'ceiling', 'floor', 'trunc', 'power', 'sqrt', 'mod'].includes(expr.name)) {
          return expr.name === 'sqrt' || expr.name === 'power' ? 'numeric' : undefined;
        }
        if (['upper', 'lower', 'trim', 'ltrim', 'rtrim', 'substring', 'substr', 'left', 'right', 'concat', 'concat_ws', 'replace', 'initcap', 'lpad', 'rpad', 'string_agg', 'to_char'].includes(expr.name)) {
          return 'text';
        }
        if (['length', 'char_length', 'character_length', 'position', 'strpos', 'extract', 'date_part', 'age_in_days'].includes(expr.name)) {
          return 'integer';
        }
        return undefined;
      }

      case 'case': {
        const types = [
          ...expr.whens.map((w) => this.staticType(w.then, schema)),
          ...(expr.else ? [this.staticType(expr.else, schema)] : []),
        ].filter((t): t is SqlColumnType => t !== undefined);
        if (types.length === 0) return undefined;
        if (types.some((t) => t === 'numeric')) return 'numeric';
        return types.every((t) => t === types[0]) ? types[0] : undefined;
      }

      default:
        return undefined;
    }
  }

  /* --------------------------------------------------------- expressions */

  private rowContext(schema: ColumnRef[], row: SqlValue[], parent: Scope | null): EvalContext {
    return {
      scope: { schema, row, parent },
      groupRows: null,
      groupSchema: null,
      windowValues: null,
      groupedExprs: null,
      groupedKeys: null,
    };
  }

  private evalBool(expr: Expr, ctx: EvalContext): Bool3 {
    return toBool(this.evalExpr(expr, ctx));
  }

  evalExpr(expr: Expr, ctx: EvalContext): SqlValue {
    this.budget.tick();

    // An expression that is itself a grouping key may be evaluated freely:
    // every row in the group produces the same value for it.
    if (ctx.groupedKeys && ctx.groupedKeys.has(exprKey(expr))) {
      return this.evalExpr(expr, { ...ctx, groupedExprs: null, groupedKeys: null });
    }

    switch (expr.kind) {
      case 'literal':
        return expr.value;

      case 'star':
        throw new SqlError('"*" can only be used in a SELECT list or as COUNT(*)');

      case 'column':
        return this.resolveColumn(expr, ctx);

      case 'unary': {
        if (expr.op === 'not') return not3(this.evalBool(expr.operand, ctx));
        const v = toNumber(this.evalExpr(expr.operand, ctx), 'a numeric operand');
        if (v === null) return null;
        return expr.op === '-' ? -v : v;
      }

      case 'binary':
        return this.evalBinary(expr, ctx);

      case 'isnull': {
        const v = this.evalExpr(expr.operand, ctx);
        return expr.negated ? !isNull(v) : isNull(v);
      }

      case 'between': {
        const v = this.evalExpr(expr.operand, ctx);
        const lo = this.evalExpr(expr.low, ctx);
        const hi = this.evalExpr(expr.high, ctx);
        const ge = compareValues(v, lo);
        const le = compareValues(v, hi);
        if (ge === null || le === null) return null;
        const inside = ge >= 0 && le <= 0;
        return expr.negated ? !inside : inside;
      }

      case 'like': {
        const v = toText(this.evalExpr(expr.operand, ctx));
        const p = toText(this.evalExpr(expr.pattern, ctx));
        if (v === null || p === null) return null;
        const escape = expr.escape ? (toText(this.evalExpr(expr.escape, ctx)) ?? '\\') : '\\';
        const matched = likeToRegExp(p, expr.caseInsensitive, escape).test(v);
        return expr.negated ? !matched : matched;
      }

      case 'in-list': {
        const v = this.evalExpr(expr.operand, ctx);
        const values = expr.list.map((e) => this.evalExpr(e, ctx));
        return this.inResult(v, values, expr.negated);
      }

      case 'in-select': {
        const v = this.evalExpr(expr.operand, ctx);
        const rel = this.runSubquery(expr.select, ctx);
        if (rel.schema.length !== 1) {
          throw new SqlError('A subquery used with IN must return exactly one column');
        }
        return this.inResult(v, rel.rows.map((r) => r[0] as SqlValue), expr.negated);
      }

      case 'exists': {
        const rel = this.runSubquery(expr.select, ctx);
        const found = rel.rows.length > 0;
        return expr.negated ? !found : found;
      }

      case 'scalar-select': {
        const rel = this.runSubquery(expr.select, ctx);
        if (rel.schema.length !== 1) {
          throw new SqlError('A scalar subquery must return exactly one column');
        }
        if (rel.rows.length === 0) return null;
        if (rel.rows.length > 1) {
          throw new SqlError(
            `A scalar subquery returned ${rel.rows.length} rows, but only one value is allowed here`
          );
        }
        return (rel.rows[0] as SqlValue[])[0] as SqlValue;
      }

      case 'quantified': {
        const left = this.evalExpr(expr.left, ctx);
        const rel = this.runSubquery(expr.select, ctx);
        if (rel.schema.length !== 1) {
          throw new SqlError('A subquery used with ANY/ALL must return exactly one column');
        }
        let sawNull = false;
        let anyTrue = false;
        let allTrue = true;
        for (const row of rel.rows) {
          const cmp = this.compareWithOp(left, row[0] as SqlValue, expr.op);
          if (cmp === null) sawNull = true;
          else if (cmp) anyTrue = true;
          else allTrue = false;
        }
        if (expr.quantifier === 'any') {
          if (anyTrue) return true;
          return sawNull ? null : false;
        }
        if (!allTrue) return false;
        return sawNull ? null : true;
      }

      case 'case': {
        if (expr.operand) {
          const subject = this.evalExpr(expr.operand, ctx);
          for (const branch of expr.whens) {
            const candidate = this.evalExpr(branch.when, ctx);
            if (compareValues(subject, candidate) === 0) return this.evalExpr(branch.then, ctx);
          }
        } else {
          for (const branch of expr.whens) {
            if (isTruthy(this.evalBool(branch.when, ctx))) return this.evalExpr(branch.then, ctx);
          }
        }
        return expr.else ? this.evalExpr(expr.else, ctx) : null;
      }

      case 'cast':
        return castValue(this.evalExpr(expr.operand, ctx), expr.to);

      case 'func':
        return this.evalFunction(expr, ctx);
    }
  }

  private inResult(v: SqlValue, values: SqlValue[], negated: boolean): Bool3 {
    if (isNull(v)) return null;
    let sawNull = false;
    for (const candidate of values) {
      if (isNull(candidate)) {
        sawNull = true;
        continue;
      }
      if (compareValues(v, candidate) === 0) return !negated;
    }
    // The classic NOT IN trap: a NULL in the list makes the answer unknown.
    if (sawNull) return null;
    return negated;
  }

  private compareWithOp(a: SqlValue, b: SqlValue, op: string): Bool3 {
    const cmp = compareValues(a, b);
    if (cmp === null) return null;
    switch (op) {
      case '=':
        return cmp === 0;
      case '<>':
        return cmp !== 0;
      case '<':
        return cmp < 0;
      case '>':
        return cmp > 0;
      case '<=':
        return cmp <= 0;
      case '>=':
        return cmp >= 0;
      default:
        throw new SqlError(`Unsupported comparison operator ${op}`);
    }
  }

  private evalBinary(expr: Extract<Expr, { kind: 'binary' }>, ctx: EvalContext): SqlValue {
    if (expr.op === 'and') {
      return and3(this.evalBool(expr.left, ctx), this.evalBool(expr.right, ctx));
    }
    if (expr.op === 'or') {
      return or3(this.evalBool(expr.left, ctx), this.evalBool(expr.right, ctx));
    }

    const a = this.evalExpr(expr.left, ctx);
    const b = this.evalExpr(expr.right, ctx);

    if (expr.op === '||') {
      // PostgreSQL: concatenating anything with NULL yields NULL.
      if (isNull(a) || isNull(b)) return null;
      return (toText(a) as string) + (toText(b) as string);
    }

    if (['=', '<>', '<', '>', '<=', '>='].includes(expr.op)) {
      return this.compareWithOp(a, b, expr.op);
    }

    const an = toNumber(a, 'a numeric operand');
    const bn = toNumber(b, 'a numeric operand');
    if (an === null || bn === null) return null;

    switch (expr.op) {
      case '+':
        return an + bn;
      case '-':
        return an - bn;
      case '*':
        return an * bn;
      case '/': {
        if (bn === 0) throw new SqlError('division by zero');
        // Integer division truncates in PostgreSQL, but only when *both*
        // operands are integer-typed — `7 / 2` is 3 while `7.0 / 2` is 3.5.
        const schema = ctx.scope?.schema ?? [];
        const integerDivision =
          this.staticType(expr.left, schema) === 'integer' &&
          this.staticType(expr.right, schema) === 'integer';
        return integerDivision ? Math.trunc(an / bn) : an / bn;
      }
      case '%':
        if (bn === 0) throw new SqlError('division by zero');
        return an % bn;
      default:
        throw new SqlError(`Unsupported operator ${expr.op}`);
    }
  }

  private resolveColumn(expr: Extract<Expr, { kind: 'column' }>, ctx: EvalContext): SqlValue {
    // In a grouped query a bare column must be one of the grouping keys.
    if (ctx.groupedExprs && ctx.groupedExprs.length > 0) {
      const grouped = ctx.groupedExprs.some(
        (g) => g.kind === 'column' && g.name === expr.name && (g.table === expr.table || g.table === null || expr.table === null)
      );
      if (!grouped) {
        throw new SqlError(
          `Column "${expr.table ? expr.table + '.' : ''}${expr.name}" must appear in the GROUP BY clause or be used in an aggregate function`
        );
      }
    }

    let scope = ctx.scope;
    while (scope) {
      const hits: number[] = [];
      for (let i = 0; i < scope.schema.length; i++) {
        const col = scope.schema[i] as ColumnRef;
        if (col.name !== expr.name) continue;
        if (expr.table !== null && col.table !== expr.table) continue;
        hits.push(i);
      }
      if (hits.length === 1) return scope.row[hits[0] as number] as SqlValue;
      if (hits.length > 1) {
        throw new SqlError(
          `Column reference "${expr.name}" is ambiguous — qualify it with a table name or alias`
        );
      }
      scope = scope.parent;
    }

    const available = ctx.scope
      ? [...new Set(ctx.scope.schema.map((c) => (c.table ? c.table + '.' + c.name : c.name)))]
          .slice(0, 12)
          .join(', ')
      : 'none';
    throw new SqlError(
      `Column "${expr.table ? expr.table + '.' : ''}${expr.name}" does not exist. Available: ${available}`
    );
  }

  private runSubquery(select: SelectStmt, ctx: EvalContext): Relation {
    return this.execSelect(select, ctx.scope);
  }

  /* ----------------------------------------------------------- functions */

  private evalFunction(expr: Extract<Expr, { kind: 'func' }>, ctx: EvalContext): SqlValue {
    if (expr.over) {
      if (!ctx.windowValues || !ctx.windowValues.has(expr)) {
        throw new SqlError(
          `Window function ${expr.name}() can only be used in the SELECT list or ORDER BY`
        );
      }
      return ctx.windowValues.get(expr) as SqlValue;
    }

    if (isWindowOnly(expr.name)) {
      throw new SqlError(`${expr.name}() requires an OVER (...) clause`);
    }

    if (isAggregate(expr.name)) {
      if (!ctx.groupRows || !ctx.groupSchema) {
        throw new SqlError(
          `${expr.name}() is an aggregate and cannot be used here — it belongs in a SELECT list or HAVING clause`
        );
      }
      return this.evalAggregate(expr, ctx.groupRows, ctx.groupSchema, ctx.scope?.parent ?? null);
    }

    if (!isScalarFunction(expr.name)) {
      throw new SqlError(`Unknown function ${expr.name}()`);
    }

    const args = expr.args.map((a) => this.evalExpr(a, ctx));
    return callScalar(expr.name, args);
  }

  /** Values the aggregate sees, one per group row, with NULLs kept for COUNT(*). */
  private aggregateInputs(
    expr: Extract<Expr, { kind: 'func' }>,
    rows: SqlValue[][],
    schema: ColumnRef[],
    parent: Scope | null
  ): SqlValue[] {
    const arg = expr.args[0];
    if (!arg) return rows.map(() => null);

    let values = rows.map((row) => {
      this.budget.tick();
      return this.evalExpr(arg, this.rowContext(schema, row, parent));
    });

    if (expr.aggOrder && expr.aggOrder.length > 0) {
      const keyed = values.map((value, i) => ({
        value,
        keys: (expr.aggOrder as OrderItem[]).map((o) =>
          this.evalExpr(o.expr, this.rowContext(schema, rows[i] as SqlValue[], parent))
        ),
      }));
      keyed.sort((a, b) => {
        const order = expr.aggOrder as OrderItem[];
        for (let i = 0; i < order.length; i++) {
          const item = order[i] as OrderItem;
          const cmp = orderCompare(a.keys[i] as SqlValue, b.keys[i] as SqlValue, item.direction, item.nulls);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      values = keyed.map((k) => k.value);
    }

    if (expr.distinct) values = dedupe(values.map((v) => [v]), (r) => groupKey(r)).map((r) => r[0] as SqlValue);
    return values;
  }

  private evalAggregate(
    expr: Extract<Expr, { kind: 'func' }>,
    rows: SqlValue[][],
    schema: ColumnRef[],
    parent: Scope | null
  ): SqlValue {
    const name = expr.name;

    if (name === 'count') {
      const arg = expr.args[0];
      // COUNT(*) counts rows; COUNT(column) counts non-NULL values.
      if (!arg || arg.kind === 'star') {
        if (expr.distinct) throw new SqlError('COUNT(DISTINCT *) is not valid');
        return rows.length;
      }
      return this.aggregateInputs(expr, rows, schema, parent).filter((v) => !isNull(v)).length;
    }

    const values = this.aggregateInputs(expr, rows, schema, parent).filter((v) => !isNull(v));

    switch (name) {
      case 'sum': {
        if (values.length === 0) return null;
        return values.reduce<number>((n, v) => n + (toNumber(v, 'a SUM() input') ?? 0), 0);
      }
      case 'avg': {
        if (values.length === 0) return null;
        const total = values.reduce<number>((n, v) => n + (toNumber(v, 'an AVG() input') ?? 0), 0);
        return total / values.length;
      }
      case 'min': {
        if (values.length === 0) return null;
        return values.reduce((best, v) => ((compareValues(v, best) ?? 0) < 0 ? v : best));
      }
      case 'max': {
        if (values.length === 0) return null;
        return values.reduce((best, v) => ((compareValues(v, best) ?? 0) > 0 ? v : best));
      }
      case 'string_agg':
      case 'array_agg': {
        if (values.length === 0) return null;
        let separator = ',';
        if (name === 'string_agg') {
          const sepExpr = expr.args[1];
          if (!sepExpr) throw new SqlError('string_agg() needs a separator as its second argument');
          const first = rows[0];
          separator =
            toText(
              this.evalExpr(sepExpr, this.rowContext(schema, first ?? [], parent))
            ) ?? ',';
        }
        return values.map((v) => toText(v) ?? '').join(separator);
      }
      case 'bool_and':
      case 'every':
        return values.every((v) => toBool(v) === true);
      case 'bool_or':
        return values.some((v) => toBool(v) === true);
      default:
        throw new SqlError(`Unsupported aggregate ${name}()`);
    }
  }

  /* ------------------------------------------------------------- windows */

  private computeWindow(
    call: Extract<Expr, { kind: 'func' }>,
    outputRows: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }[],
    contextFor: (o: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }) => EvalContext
  ): void {
    const spec = call.over as WindowSpec;

    // Partition and order expressions are evaluated per output row, inside the
    // same group context, so they may reference grouping keys and aggregates.
    const baseCtx = (o: (typeof outputRows)[number]): EvalContext => {
      const ctx = contextFor(o);
      // Window arguments are not themselves window expressions.
      return { ...ctx, windowValues: new Map() };
    };

    const partitions = new Map<string, number[]>();
    outputRows.forEach((o, i) => {
      this.budget.tick();
      const key = groupKey(spec.partitionBy.map((e) => this.evalExpr(e, baseCtx(o))));
      const bucket = partitions.get(key);
      if (bucket) bucket.push(i);
      else partitions.set(key, [i]);
    });

    for (const indices of partitions.values()) {
      const ordered =
        spec.orderBy.length === 0
          ? indices
          : [...indices].sort((ia, ib) => {
              for (const item of spec.orderBy) {
                const av = this.evalExpr(item.expr, baseCtx(outputRows[ia] as (typeof outputRows)[number]));
                const bv = this.evalExpr(item.expr, baseCtx(outputRows[ib] as (typeof outputRows)[number]));
                const cmp = orderCompare(av, bv, item.direction, item.nulls);
                if (cmp !== 0) return cmp;
              }
              return 0;
            });

      // Peer groups: rows that tie on every ORDER BY key, which RANK and the
      // default RANGE frame both depend on.
      const orderKeys = ordered.map((i) =>
        groupKey(spec.orderBy.map((o) => this.evalExpr(o.expr, baseCtx(outputRows[i] as (typeof outputRows)[number]))))
      );

      const argValues = ordered.map((i) => {
        const arg = call.args[0];
        if (!arg || arg.kind === 'star') return null;
        return this.evalExpr(arg, baseCtx(outputRows[i] as (typeof outputRows)[number]));
      });

      const n = ordered.length;

      for (let pos = 0; pos < n; pos++) {
        this.budget.tick();
        const target = outputRows[ordered[pos] as number] as (typeof outputRows)[number];
        const value = this.windowValueAt(call, spec, {
          pos,
          ordered,
          orderKeys,
          argValues,
          outputRows,
          baseCtx,
        });
        target.windowValues.set(call, value);
      }
    }
  }

  private windowValueAt(
    call: Extract<Expr, { kind: 'func' }>,
    spec: WindowSpec,
    env: {
      pos: number;
      ordered: number[];
      orderKeys: string[];
      argValues: SqlValue[];
      outputRows: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }[];
      baseCtx: (o: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }) => EvalContext;
    }
  ): SqlValue {
    const { pos, ordered, orderKeys, argValues } = env;
    const n = ordered.length;
    const name = call.name;

    const literalArg = (index: number, fallback: number): number => {
      const arg = call.args[index];
      if (!arg) return fallback;
      const ctx = env.baseCtx(env.outputRows[ordered[pos] as number] as never);
      const v = toNumber(this.evalExpr(arg, ctx), `an argument to ${name}()`);
      return v === null ? fallback : Math.trunc(v);
    };

    switch (name) {
      case 'row_number':
        return pos + 1;

      case 'rank': {
        // 1 + the number of rows strictly ahead of this row's peer group.
        let firstPeer = pos;
        while (firstPeer > 0 && orderKeys[firstPeer - 1] === orderKeys[pos]) firstPeer--;
        return firstPeer + 1;
      }

      case 'dense_rank': {
        let dense = 1;
        for (let i = 1; i <= pos; i++) if (orderKeys[i] !== orderKeys[i - 1]) dense++;
        return dense;
      }

      case 'percent_rank': {
        let firstPeer = pos;
        while (firstPeer > 0 && orderKeys[firstPeer - 1] === orderKeys[pos]) firstPeer--;
        return n === 1 ? 0 : firstPeer / (n - 1);
      }

      case 'cume_dist': {
        let lastPeer = pos;
        while (lastPeer < n - 1 && orderKeys[lastPeer + 1] === orderKeys[pos]) lastPeer++;
        return (lastPeer + 1) / n;
      }

      case 'ntile': {
        const buckets = Math.max(1, literalArg(0, 1));
        const size = Math.floor(n / buckets);
        const remainder = n % buckets;
        let index = 0;
        for (let b = 0; b < buckets; b++) {
          const take = size + (b < remainder ? 1 : 0);
          if (pos < index + take) return b + 1;
          index += take;
        }
        return buckets;
      }

      case 'lag':
      case 'lead': {
        const offset = call.args.length > 1 ? literalArg(1, 1) : 1;
        const target = name === 'lag' ? pos - offset : pos + offset;
        if (target < 0 || target >= n) {
          if (call.args.length > 2) {
            const ctx = env.baseCtx(env.outputRows[ordered[pos] as number] as never);
            return this.evalExpr(call.args[2] as Expr, ctx);
          }
          return null;
        }
        return argValues[target] as SqlValue;
      }

      default:
        break;
    }

    /* Frame-based: aggregates, first_value, last_value, nth_value. */
    const [start, end] = this.frameBounds(spec, pos, n, orderKeys, env);
    const slice = argValues.slice(start, end + 1);

    switch (name) {
      case 'first_value':
        return slice.length === 0 ? null : (slice[0] as SqlValue);
      case 'last_value':
        return slice.length === 0 ? null : (slice[slice.length - 1] as SqlValue);
      case 'nth_value': {
        const nth = literalArg(1, 1);
        return nth >= 1 && nth <= slice.length ? (slice[nth - 1] as SqlValue) : null;
      }
      case 'count': {
        const arg = call.args[0];
        if (!arg || arg.kind === 'star') return end - start + 1 > 0 ? end - start + 1 : 0;
        return slice.filter((v) => !isNull(v)).length;
      }
      case 'sum': {
        const present = slice.filter((v) => !isNull(v));
        if (present.length === 0) return null;
        return present.reduce<number>((acc, v) => acc + (toNumber(v, 'a SUM() input') ?? 0), 0);
      }
      case 'avg': {
        const present = slice.filter((v) => !isNull(v));
        if (present.length === 0) return null;
        return present.reduce<number>((acc, v) => acc + (toNumber(v, 'an AVG() input') ?? 0), 0) / present.length;
      }
      case 'min': {
        const present = slice.filter((v) => !isNull(v));
        if (present.length === 0) return null;
        return present.reduce((best, v) => ((compareValues(v, best) ?? 0) < 0 ? v : best));
      }
      case 'max': {
        const present = slice.filter((v) => !isNull(v));
        if (present.length === 0) return null;
        return present.reduce((best, v) => ((compareValues(v, best) ?? 0) > 0 ? v : best));
      }
      case 'string_agg': {
        const present = slice.filter((v) => !isNull(v));
        if (present.length === 0) return null;
        return present.map((v) => toText(v) ?? '').join(',');
      }
      default:
        throw new SqlError(`${name}() is not supported as a window function`);
    }
  }

  /** Inclusive [start, end] row offsets of the current frame. */
  private frameBounds(
    spec: WindowSpec,
    pos: number,
    n: number,
    orderKeys: string[],
    env: {
      ordered: number[];
      outputRows: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }[];
      baseCtx: (o: { row: SqlValue[]; groupRows: SqlValue[][] | null; windowValues: Map<Expr, SqlValue> }) => EvalContext;
    }
  ): [number, number] {
    const lastPeer = () => {
      let i = pos;
      while (i < n - 1 && orderKeys[i + 1] === orderKeys[pos]) i++;
      return i;
    };
    const firstPeer = () => {
      let i = pos;
      while (i > 0 && orderKeys[i - 1] === orderKeys[pos]) i--;
      return i;
    };

    if (!spec.frame) {
      // The SQL default: whole partition with no ORDER BY, otherwise
      // everything up to and including the current row's peers. That default
      // is what makes SUM(...) OVER (ORDER BY ...) a running total.
      if (spec.orderBy.length === 0) return [0, n - 1];
      return [0, lastPeer()];
    }

    const offsetOf = (expr: Expr): number => {
      const ctx = env.baseCtx(env.outputRows[env.ordered[pos] as number] as never);
      const v = toNumber(this.evalExpr(expr, ctx), 'a window frame offset');
      if (v === null || v < 0) throw new SqlError('A window frame offset must be a non-negative number');
      return Math.trunc(v);
    };

    const resolve = (bound: typeof spec.frame.start, isStart: boolean): number => {
      switch (bound.type) {
        case 'unbounded-preceding':
          return 0;
        case 'unbounded-following':
          return n - 1;
        case 'current-row':
          if (spec.frame?.units === 'range') return isStart ? firstPeer() : lastPeer();
          return pos;
        case 'preceding':
          return spec.frame?.units === 'rows'
            ? Math.max(0, pos - offsetOf(bound.offset))
            : Math.max(0, firstPeer() - offsetOf(bound.offset));
        case 'following':
          return spec.frame?.units === 'rows'
            ? Math.min(n - 1, pos + offsetOf(bound.offset))
            : Math.min(n - 1, lastPeer() + offsetOf(bound.offset));
      }
    };

    const start = resolve(spec.frame.start, true);
    const end = resolve(spec.frame.end, false);
    return [start, Math.max(start - 1, end)];
  }

  /* ------------------------------------------------------------------ DML */

  private execInsert(stmt: InsertStmt): ResultSet {
    const table = this.table(stmt.table);
    const targetColumns = stmt.columns ?? table.columns;

    for (const col of targetColumns) {
      if (!table.columns.includes(col)) {
        throw new SqlError(`Table "${table.name}" has no column "${col}"`);
      }
    }

    const ctx: EvalContext = {
      scope: null,
      groupRows: null,
      groupSchema: null,
      windowValues: null,
      groupedExprs: null,
      groupedKeys: null,
    };

    const incoming: SqlValue[][] = [];
    if (stmt.values) {
      for (const row of stmt.values) {
        if (row.length !== targetColumns.length) {
          throw new SqlError(
            `INSERT has ${targetColumns.length} target column(s) but ${row.length} value(s)`
          );
        }
        incoming.push(row.map((e) => this.evalExpr(e, ctx)));
      }
    } else if (stmt.select) {
      const rel = this.execSelect(stmt.select, null);
      if (rel.schema.length !== targetColumns.length) {
        throw new SqlError(
          `INSERT has ${targetColumns.length} target column(s) but the SELECT returns ${rel.schema.length}`
        );
      }
      incoming.push(...rel.rows);
    }

    const added: SqlValue[][] = [];
    for (const values of incoming) {
      const full = table.columns.map((name) => {
        const at = targetColumns.indexOf(name);
        return at === -1 ? null : (values[at] as SqlValue);
      });
      table.rows.push(full);
      added.push(full);
    }

    return this.dmlResult('INSERT', added.length, stmt.returning, table, added);
  }

  private execUpdate(stmt: UpdateStmt): ResultSet {
    const table = this.table(stmt.table);
    const alias = stmt.alias ?? table.name;
    const schema: ColumnRef[] = table.columns.map((name) => ({ table: alias, name }));

    for (const a of stmt.assignments) {
      if (!table.columns.includes(a.column)) {
        throw new SqlError(`Table "${table.name}" has no column "${a.column}"`);
      }
    }

    // UPDATE ... FROM joins each target row against the extra relation.
    const extra = stmt.from ? this.execFrom(stmt.from, null) : null;
    const changed: SqlValue[][] = [];

    for (let i = 0; i < table.rows.length; i++) {
      this.budget.tick();
      const row = table.rows[i] as SqlValue[];

      const candidates: { schema: ColumnRef[]; row: SqlValue[] }[] = extra
        ? extra.rows.map((r) => ({ schema: [...schema, ...extra.schema], row: [...row, ...r] }))
        : [{ schema, row }];

      for (const candidate of candidates) {
        const ctx = this.rowContext(candidate.schema, candidate.row, null);
        if (stmt.where && !isTruthy(this.evalBool(stmt.where, ctx))) continue;

        const updated = [...row];
        for (const assignment of stmt.assignments) {
          updated[table.columns.indexOf(assignment.column)] = this.evalExpr(assignment.value, ctx);
        }
        table.rows[i] = updated;
        changed.push(updated);
        break; // One target row is updated at most once.
      }
    }

    return this.dmlResult('UPDATE', changed.length, stmt.returning, table, changed);
  }

  private execDelete(stmt: DeleteStmt): ResultSet {
    const table = this.table(stmt.table);
    const alias = stmt.alias ?? table.name;
    const schema: ColumnRef[] = table.columns.map((name) => ({ table: alias, name }));
    const extra = stmt.using ? this.execFrom(stmt.using, null) : null;

    const kept: SqlValue[][] = [];
    const removed: SqlValue[][] = [];

    for (const row of table.rows) {
      this.budget.tick();
      let matches = false;

      const candidates: { schema: ColumnRef[]; row: SqlValue[] }[] = extra
        ? extra.rows.map((r) => ({ schema: [...schema, ...extra.schema], row: [...row, ...r] }))
        : [{ schema, row }];

      for (const candidate of candidates) {
        const ctx = this.rowContext(candidate.schema, candidate.row, null);
        if (!stmt.where || isTruthy(this.evalBool(stmt.where, ctx))) {
          matches = true;
          break;
        }
      }

      if (matches) removed.push(row);
      else kept.push(row);
    }

    table.rows.length = 0;
    table.rows.push(...kept);

    return this.dmlResult('DELETE', removed.length, stmt.returning, table, removed);
  }

  private dmlResult(
    command: 'INSERT' | 'UPDATE' | 'DELETE',
    affected: number,
    returning: { expr: Expr; alias: string | null }[] | null,
    table: TableData,
    rows: SqlValue[][]
  ): ResultSet {
    if (!returning) {
      return { columns: [], rows: [], rowsAffected: affected, command };
    }
    const schema: ColumnRef[] = table.columns.map((name) => ({ table: table.name, name }));
    const projected = this.expandSelectList(returning, schema);
    const outRows = rows.map((row) =>
      projected.map((item) => this.evalExpr(item.expr, this.rowContext(schema, row, null)))
    );
    return {
      columns: projected.map(
        (item) =>
          item.alias ?? (item.expr.kind === 'column' ? item.expr.name : deriveColumnName(item.expr))
      ),
      rows: outRows,
      rowsAffected: affected,
      command,
    };
  }
}

/* ----------------------------------------------------------------- helpers */

/** Structural identity of an expression — the AST is plain data. */
function exprKey(expr: Expr): string {
  return JSON.stringify(expr);
}

function leftTableOf(schema: ColumnRef[], name: string): string | null {
  return schema.find((c) => c.name === name)?.table ?? null;
}

function dedupe<T>(rows: T[], keyOf: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function containsAggregate(expr: Expr): boolean {
  let found = false;
  walkExpr(expr, (e) => {
    if (e.kind === 'func' && !e.over && AGGREGATE_NAMES.has(e.name)) found = true;
    // Do not descend into a subquery: its aggregates belong to that query.
    return !(e.kind === 'scalar-select' || e.kind === 'in-select' || e.kind === 'exists');
  });
  return found;
}

function collectWindowCalls(exprs: Expr[]): Extract<Expr, { kind: 'func' }>[] {
  const out: Extract<Expr, { kind: 'func' }>[] = [];
  for (const expr of exprs) {
    walkExpr(expr, (e) => {
      if (e.kind === 'func' && e.over) out.push(e);
      return !(e.kind === 'scalar-select' || e.kind === 'in-select' || e.kind === 'exists');
    });
  }
  return out;
}

/** Depth-first walk; the visitor returns false to stop descending. */
function walkExpr(expr: Expr, visit: (e: Expr) => boolean): void {
  if (!visit(expr)) return;
  switch (expr.kind) {
    case 'unary':
      walkExpr(expr.operand, visit);
      break;
    case 'binary':
      walkExpr(expr.left, visit);
      walkExpr(expr.right, visit);
      break;
    case 'isnull':
      walkExpr(expr.operand, visit);
      break;
    case 'between':
      walkExpr(expr.operand, visit);
      walkExpr(expr.low, visit);
      walkExpr(expr.high, visit);
      break;
    case 'like':
      walkExpr(expr.operand, visit);
      walkExpr(expr.pattern, visit);
      if (expr.escape) walkExpr(expr.escape, visit);
      break;
    case 'in-list':
      walkExpr(expr.operand, visit);
      expr.list.forEach((e) => walkExpr(e, visit));
      break;
    case 'in-select':
    case 'quantified':
      walkExpr(expr.kind === 'in-select' ? expr.operand : expr.left, visit);
      break;
    case 'case':
      if (expr.operand) walkExpr(expr.operand, visit);
      expr.whens.forEach((w) => {
        walkExpr(w.when, visit);
        walkExpr(w.then, visit);
      });
      if (expr.else) walkExpr(expr.else, visit);
      break;
    case 'cast':
      walkExpr(expr.operand, visit);
      break;
    case 'func':
      expr.args.forEach((a) => walkExpr(a, visit));
      if (expr.over) {
        expr.over.partitionBy.forEach((e) => walkExpr(e, visit));
        expr.over.orderBy.forEach((o) => walkExpr(o.expr, visit));
      }
      break;
    default:
      break;
  }
}

/** The column label PostgreSQL would give an unaliased expression. */
function deriveColumnName(expr: Expr): string {
  if (expr.kind === 'column') return expr.name;
  if (expr.kind === 'func') return expr.name;
  if (expr.kind === 'cast') return deriveColumnName(expr.operand);
  if (expr.kind === 'case') return 'case';
  return '?column?';
}

/* -------------------------------------------------------------- public API */

export function executeStatement(
  db: Database,
  stmt: Statement,
  limits: ExecuteLimits = DEFAULT_LIMITS
): ResultSet {
  return new Executor(db, new Budget(limits)).run(stmt);
}
