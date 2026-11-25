/**
 * Recursive-descent SQL parser targeting the PostgreSQL subset the learning
 * module teaches: SELECT with every join flavour, grouping, set operations,
 * subqueries, CTEs (including RECURSIVE), window functions, and the three DML
 * statements used by the write-query exercises.
 *
 * Error messages name what was expected, because for a learner the parse error
 * *is* the feedback.
 */

import type {
  BinaryOp,
  Cte,
  DeleteStmt,
  Expr,
  FrameBound,
  FromItem,
  InsertStmt,
  OrderItem,
  SelectItem,
  SelectStmt,
  Statement,
  UpdateStmt,
  WindowFrame,
  WindowSpec,
} from './ast';
import { SqlError, tokenize, type Token } from './tokens';

/** Words that may follow an expression as a bare alias without AS. */
const NON_ALIAS = new Set([
  'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT',
  'ON', 'USING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'NATURAL', 'AND', 'OR', 'AS',
  'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'FETCH', 'INTO', 'SET', 'VALUES', 'RETURNING',
  'WITH', 'SELECT', 'NULLS', 'OVER', 'PARTITION', 'BY', 'ROWS', 'RANGE',
]);

const COMPARISONS: BinaryOp[] = ['=', '<>', '<', '>', '<=', '>='];

/**
 * Keywords that can never be an ordinary name. Everything else in `KEYWORDS`
 * is non-reserved: `first`, `rows`, `left` and friends are legal column names
 * and function names, which is how PostgreSQL treats them too.
 */
const RESERVED_IN_EXPR = new Set([
  'ALL', 'AND', 'ANY', 'AS', 'ASC', 'BETWEEN', 'BY', 'CASE', 'CAST', 'DESC', 'DISTINCT', 'ELSE',
  'END', 'EXCEPT', 'EXISTS', 'FALSE', 'FROM', 'GROUP', 'HAVING', 'ILIKE', 'IN', 'INTERSECT',
  'INTO', 'IS', 'JOIN', 'LIKE', 'LIMIT', 'NOT', 'NULL', 'NULLS', 'OFFSET', 'ON', 'OR', 'ORDER',
  'OVER', 'PARTITION', 'SELECT', 'SET', 'SOME', 'THEN', 'TRUE', 'UNION', 'VALUES', 'WHEN',
  'WHERE', 'WITH',
]);

/** Scalar functions whose names collide with a keyword, e.g. LEFT(s, n). */
const KEYWORD_FUNCTIONS = new Set(['LEFT', 'RIGHT']);

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(sql: string) {
    this.tokens = tokenize(sql);
  }

  /* ----------------------------------------------------------- token glue */

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)] as Token;
  }

  private next(): Token {
    const t = this.peek();
    if (t.type !== 'eof') this.pos++;
    return t;
  }

  private atKeyword(...words: string[]): boolean {
    const t = this.peek();
    return t.type === 'keyword' && words.includes(t.value);
  }

  private atPunct(ch: string): boolean {
    const t = this.peek();
    return t.type === 'punct' && t.value === ch;
  }

  private atOp(op: string): boolean {
    const t = this.peek();
    return t.type === 'op' && t.value === op;
  }

  private eatKeyword(...words: string[]): boolean {
    if (this.atKeyword(...words)) {
      this.pos++;
      return true;
    }
    return false;
  }

  private eatPunct(ch: string): boolean {
    if (this.atPunct(ch)) {
      this.pos++;
      return true;
    }
    return false;
  }

  private expectKeyword(word: string): void {
    if (!this.eatKeyword(word)) this.fail(`Expected ${word}`);
  }

  private expectPunct(ch: string): void {
    if (!this.eatPunct(ch)) this.fail(`Expected ${JSON.stringify(ch)}`);
  }

  private fail(message: string): never {
    const t = this.peek();
    const found = t.type === 'eof' ? 'end of statement' : JSON.stringify(t.raw);
    throw new SqlError(`${message} but found ${found}`, t.start, t.line);
  }

  /** A bare or quoted identifier. Non-reserved keywords are accepted as names. */
  private identifier(what: string): string {
    const t = this.peek();
    if (t.type === 'ident') {
      this.pos++;
      return t.value;
    }
    if (t.type === 'keyword' && !RESERVED_IN_EXPR.has(t.value)) {
      this.pos++;
      return t.value.toLowerCase();
    }
    this.fail(`Expected ${what}`);
  }

  /* -------------------------------------------------------------- entry */

  parseStatements(): Statement[] {
    const out: Statement[] = [];
    while (this.peek().type !== 'eof') {
      if (this.eatPunct(';')) continue;
      out.push(this.parseStatement());
      if (!this.eatPunct(';') && this.peek().type !== 'eof') {
        this.fail('Expected ";" between statements');
      }
    }
    return out;
  }

  private parseStatement(): Statement {
    // A leading WITH can head a SELECT or a DML statement.
    const ctes = this.atKeyword('WITH') ? this.parseWith() : [];

    if (this.atKeyword('SELECT') || this.atPunct('(') || this.atKeyword('VALUES')) {
      const select = this.parseSelectExpression();
      select.ctes = [...ctes, ...select.ctes];
      return select;
    }
    if (this.atKeyword('INSERT')) return this.parseInsert();
    if (this.atKeyword('UPDATE')) return this.parseUpdate();
    if (this.atKeyword('DELETE')) return this.parseDelete();
    this.fail('Expected SELECT, INSERT, UPDATE or DELETE');
  }

  private parseWith(): Cte[] {
    this.expectKeyword('WITH');
    const recursive = this.eatKeyword('RECURSIVE');
    const ctes: Cte[] = [];
    do {
      const name = this.identifier('a CTE name');
      let columns: string[] | null = null;
      if (this.atPunct('(')) {
        this.expectPunct('(');
        columns = [];
        do {
          columns.push(this.identifier('a column name'));
        } while (this.eatPunct(','));
        this.expectPunct(')');
      }
      this.expectKeyword('AS');
      this.expectPunct('(');
      const select = this.parseSelectExpression();
      this.expectPunct(')');
      ctes.push({ name, columns, select, recursive });
    } while (this.eatPunct(','));
    return ctes;
  }

  /* ------------------------------------------------------------- SELECT */

  /**
   * A SELECT plus any UNION / INTERSECT / EXCEPT chained onto it.
   *
   * An ORDER BY or LIMIT written after a set operation applies to the whole
   * expression, not to the arm it happens to sit next to, so the arms are
   * parsed with trailing clauses disabled and the clause is attached here.
   */
  parseSelectExpression(): SelectStmt {
    let left = this.parseSelectTerm(true);
    let combined = false;

    while (this.atKeyword('UNION', 'INTERSECT', 'EXCEPT')) {
      const opToken = this.next().value;
      const all = this.eatKeyword('ALL');
      this.eatKeyword('DISTINCT');
      const right = this.parseSelectTerm(false);
      const op = opToken.toLowerCase() as 'union' | 'intersect' | 'except';
      // Chain left-associatively: the accumulated select becomes the left arm.
      left = { ...left, setOp: { op, all, right } };
      combined = true;
    }

    if (combined) {
      // Whatever the left arm parsed for itself is superseded by the clauses
      // that trail the whole expression.
      left.orderBy = this.atKeyword('ORDER') ? this.parseOrderBy() : [];
      left.limit = null;
      left.offset = null;
      if (this.atKeyword('LIMIT', 'OFFSET', 'FETCH')) this.parseLimitInto(left);
    }

    return left;
  }

  private parseSelectTerm(allowTrailing: boolean): SelectStmt {
    if (this.atPunct('(')) {
      this.expectPunct('(');
      const inner = this.parseSelectExpression();
      this.expectPunct(')');
      if (allowTrailing) {
        if (this.atKeyword('ORDER')) inner.orderBy = this.parseOrderBy();
        if (this.atKeyword('LIMIT', 'OFFSET', 'FETCH')) this.parseLimitInto(inner);
      }
      return inner;
    }

    if (this.atKeyword('WITH')) {
      const ctes = this.parseWith();
      const select = this.parseSelectTerm(allowTrailing);
      select.ctes = [...ctes, ...select.ctes];
      return select;
    }

    if (this.atKeyword('VALUES')) return this.parseValuesSelect();

    return this.parseSimpleSelect(allowTrailing);
  }

  private parseValuesSelect(): SelectStmt {
    this.expectKeyword('VALUES');
    const rows: Expr[][] = [];
    do {
      this.expectPunct('(');
      const row: Expr[] = [];
      do {
        row.push(this.parseExpr());
      } while (this.eatPunct(','));
      this.expectPunct(')');
      rows.push(row);
    } while (this.eatPunct(','));

    const stmt = this.emptySelect();
    stmt.values = rows;
    if (this.atKeyword('ORDER')) stmt.orderBy = this.parseOrderBy();
    if (this.atKeyword('LIMIT', 'OFFSET', 'FETCH')) this.parseLimitInto(stmt);
    return stmt;
  }

  private emptySelect(): SelectStmt {
    return {
      type: 'select',
      ctes: [],
      distinct: false,
      distinctOn: null,
      columns: [],
      from: null,
      where: null,
      groupBy: [],
      having: null,
      orderBy: [],
      limit: null,
      offset: null,
      setOp: null,
      values: null,
    };
  }

  private parseSimpleSelect(allowTrailing = true): SelectStmt {
    this.expectKeyword('SELECT');
    const stmt = this.emptySelect();

    if (this.eatKeyword('DISTINCT')) {
      stmt.distinct = true;
      if (this.atKeyword('ON')) {
        this.expectKeyword('ON');
        this.expectPunct('(');
        stmt.distinctOn = [];
        do {
          stmt.distinctOn.push(this.parseExpr());
        } while (this.eatPunct(','));
        this.expectPunct(')');
      }
    } else {
      this.eatKeyword('ALL');
    }

    stmt.columns = this.parseSelectList();

    if (this.eatKeyword('FROM')) stmt.from = this.parseFrom();
    if (this.eatKeyword('WHERE')) stmt.where = this.parseExpr();

    if (this.atKeyword('GROUP')) {
      this.expectKeyword('GROUP');
      this.expectKeyword('BY');
      do {
        stmt.groupBy.push(this.parseExpr());
      } while (this.eatPunct(','));
    }

    if (this.eatKeyword('HAVING')) stmt.having = this.parseExpr();
    if (allowTrailing) {
      if (this.atKeyword('ORDER')) stmt.orderBy = this.parseOrderBy();
      if (this.atKeyword('LIMIT', 'OFFSET', 'FETCH')) this.parseLimitInto(stmt);
    }

    return stmt;
  }

  private parseSelectList(): SelectItem[] {
    const items: SelectItem[] = [];
    do {
      if (this.atOp('*')) {
        this.next();
        items.push({ expr: { kind: 'star', table: null }, alias: null });
        continue;
      }
      // table.* — lookahead past the dot.
      if (
        this.peek().type === 'ident' &&
        this.peek(1).type === 'punct' &&
        this.peek(1).value === '.' &&
        this.peek(2).type === 'op' &&
        this.peek(2).value === '*'
      ) {
        const table = this.next().value;
        this.next();
        this.next();
        items.push({ expr: { kind: 'star', table }, alias: null });
        continue;
      }

      const expr = this.parseExpr();
      items.push({ expr, alias: this.parseAlias() });
    } while (this.eatPunct(','));
    return items;
  }

  private parseAlias(): string | null {
    // After an explicit AS, anything that is not reserved may be the alias.
    if (this.eatKeyword('AS')) return this.identifier('an alias after AS');
    const t = this.peek();
    if (t.type === 'ident') {
      this.pos++;
      return t.value;
    }
    // A non-reserved keyword can still be an alias (e.g. `AS count` is common).
    if (t.type === 'keyword' && !NON_ALIAS.has(t.value)) {
      this.pos++;
      return t.value.toLowerCase();
    }
    return null;
  }

  private parseOrderBy(): OrderItem[] {
    this.expectKeyword('ORDER');
    this.expectKeyword('BY');
    const items: OrderItem[] = [];
    do {
      const expr = this.parseExpr();
      let direction: 'asc' | 'desc' = 'asc';
      if (this.eatKeyword('DESC')) direction = 'desc';
      else this.eatKeyword('ASC');

      // PostgreSQL's defaults: ASC sorts NULLs last, DESC sorts them first.
      let nulls: 'first' | 'last' = direction === 'asc' ? 'last' : 'first';
      if (this.eatKeyword('NULLS')) {
        if (this.eatKeyword('FIRST')) nulls = 'first';
        else if (this.eatKeyword('LAST')) nulls = 'last';
        else this.fail('Expected FIRST or LAST after NULLS');
      }
      items.push({ expr, direction, nulls });
    } while (this.eatPunct(','));
    return items;
  }

  private parseLimitInto(stmt: SelectStmt): void {
    // Both LIMIT n OFFSET m and OFFSET m FETCH NEXT n ROWS ONLY.
    for (;;) {
      if (this.eatKeyword('LIMIT')) {
        if (this.eatKeyword('ALL')) stmt.limit = null;
        else stmt.limit = this.parseExpr();
        continue;
      }
      if (this.eatKeyword('OFFSET')) {
        stmt.offset = this.parseExpr();
        if (!this.eatKeyword('ROW')) this.eatKeyword('ROWS');
        continue;
      }
      if (this.eatKeyword('FETCH')) {
        if (!this.eatKeyword('FIRST')) this.expectKeyword('NEXT');
        if (!this.atKeyword('ROW', 'ROWS')) stmt.limit = this.parseExpr();
        if (!this.eatKeyword('ROW')) this.expectKeyword('ROWS');
        this.expectKeyword('ONLY');
        continue;
      }
      break;
    }
  }

  /* --------------------------------------------------------------- FROM */

  private parseFrom(): FromItem {
    let left = this.parseFromPrimary();

    for (;;) {
      if (this.eatPunct(',')) {
        // Comma-separated tables are a CROSS JOIN.
        const right = this.parseFromPrimary();
        left = { kind: 'join', joinType: 'cross', left, right, on: null, using: null };
        continue;
      }

      const save = this.pos;
      let joinType: 'inner' | 'left' | 'right' | 'full' | 'cross' | null = null;

      if (this.eatKeyword('CROSS')) {
        this.expectKeyword('JOIN');
        joinType = 'cross';
      } else if (this.eatKeyword('INNER')) {
        this.expectKeyword('JOIN');
        joinType = 'inner';
      } else if (this.atKeyword('LEFT', 'RIGHT', 'FULL')) {
        const word = this.next().value;
        this.eatKeyword('OUTER');
        this.expectKeyword('JOIN');
        joinType = word.toLowerCase() as 'left' | 'right' | 'full';
      } else if (this.eatKeyword('JOIN')) {
        joinType = 'inner';
      } else if (this.atKeyword('NATURAL')) {
        this.fail('NATURAL JOIN is not supported — write the join condition with ON');
      }

      if (joinType === null) {
        this.pos = save;
        break;
      }

      const right = this.parseFromPrimary();
      let on: Expr | null = null;
      let using: string[] | null = null;

      if (this.eatKeyword('ON')) {
        on = this.parseExpr();
      } else if (this.eatKeyword('USING')) {
        this.expectPunct('(');
        using = [];
        do {
          using.push(this.identifier('a column name'));
        } while (this.eatPunct(','));
        this.expectPunct(')');
      } else if (joinType !== 'cross') {
        this.fail(`A ${joinType.toUpperCase()} JOIN needs an ON condition`);
      }

      left = { kind: 'join', joinType, left, right, on, using };
    }

    return left;
  }

  private parseFromPrimary(): FromItem {
    if (this.atPunct('(')) {
      this.expectPunct('(');
      // Either a derived table or a parenthesised join expression.
      if (this.atKeyword('SELECT', 'WITH', 'VALUES') || this.atPunct('(')) {
        const select = this.parseSelectExpression();
        this.expectPunct(')');
        this.eatKeyword('AS');
        const alias = this.identifier('an alias for the subquery (a derived table needs one)');
        return { kind: 'subquery', select, alias };
      }
      const inner = this.parseFrom();
      this.expectPunct(')');
      return inner;
    }

    const name = this.identifier('a table name');
    let alias: string | null = null;
    if (this.eatKeyword('AS')) alias = this.identifier('an alias after AS');
    else {
      const t = this.peek();
      if (t.type === 'ident') {
        this.pos++;
        alias = t.value;
      }
    }
    return { kind: 'table', name, alias };
  }

  /* -------------------------------------------------------- expressions */

  parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.eatKeyword('OR')) {
      left = { kind: 'binary', op: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.eatKeyword('AND')) {
      left = { kind: 'binary', op: 'and', left, right: this.parseNot() };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.eatKeyword('NOT')) {
      return { kind: 'unary', op: 'not', operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    let left = this.parseConcat();

    for (;;) {
      // IS [NOT] NULL / TRUE / FALSE / DISTINCT FROM
      if (this.atKeyword('IS')) {
        this.next();
        const negated = this.eatKeyword('NOT');
        if (this.eatKeyword('NULL')) {
          left = { kind: 'isnull', operand: left, negated };
          continue;
        }
        if (this.atKeyword('TRUE', 'FALSE')) {
          const want = this.next().value === 'TRUE';
          const cmp: Expr = {
            kind: 'binary',
            op: '=',
            left,
            right: { kind: 'literal', value: want },
          };
          left = negated ? { kind: 'unary', op: 'not', operand: cmp } : cmp;
          continue;
        }
        this.fail('Expected NULL, TRUE or FALSE after IS');
      }

      const negatedPredicate = this.atKeyword('NOT') && this.isPredicateAhead();
      if (negatedPredicate) this.next();

      if (this.atKeyword('BETWEEN')) {
        this.next();
        const low = this.parseConcat();
        this.expectKeyword('AND');
        const high = this.parseConcat();
        left = { kind: 'between', operand: left, low, high, negated: negatedPredicate };
        continue;
      }

      if (this.atKeyword('LIKE', 'ILIKE')) {
        const caseInsensitive = this.next().value === 'ILIKE';
        const pattern = this.parseConcat();
        let escape: Expr | undefined;
        if (this.eatKeyword('ESCAPE')) escape = this.parseConcat();
        left = {
          kind: 'like',
          operand: left,
          pattern,
          negated: negatedPredicate,
          caseInsensitive,
          ...(escape ? { escape } : {}),
        };
        continue;
      }

      if (this.atKeyword('IN')) {
        this.next();
        this.expectPunct('(');
        if (this.atKeyword('SELECT', 'WITH', 'VALUES')) {
          const select = this.parseSelectExpression();
          this.expectPunct(')');
          left = { kind: 'in-select', operand: left, select, negated: negatedPredicate };
        } else {
          const list: Expr[] = [];
          do {
            list.push(this.parseExpr());
          } while (this.eatPunct(','));
          this.expectPunct(')');
          left = { kind: 'in-list', operand: left, list, negated: negatedPredicate };
        }
        continue;
      }

      if (negatedPredicate) this.fail('Expected BETWEEN, LIKE or IN after NOT');

      const op = COMPARISONS.find((o) => this.atOp(o === '<>' ? '<>' : o));
      if (op || this.atOp('!=')) {
        const raw = this.next().value;
        const normalised: BinaryOp = raw === '!=' ? '<>' : (raw as BinaryOp);

        if (this.atKeyword('ANY', 'SOME', 'ALL')) {
          const q = this.next().value;
          this.expectPunct('(');
          const select = this.parseSelectExpression();
          this.expectPunct(')');
          left = {
            kind: 'quantified',
            op: normalised,
            left,
            quantifier: q === 'ALL' ? 'all' : 'any',
            select,
          };
          continue;
        }

        left = { kind: 'binary', op: normalised, left, right: this.parseConcat() };
        continue;
      }

      break;
    }

    return left;
  }

  /** Distinguishes `NOT IN (...)` from a bare boolean `NOT`. */
  private isPredicateAhead(): boolean {
    const t = this.peek(1);
    return t.type === 'keyword' && ['BETWEEN', 'LIKE', 'ILIKE', 'IN'].includes(t.value);
  }

  private parseConcat(): Expr {
    let left = this.parseAdditive();
    while (this.atOp('||')) {
      this.next();
      left = { kind: 'binary', op: '||', left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.atOp('+') || this.atOp('-')) {
      const op = this.next().value as BinaryOp;
      left = { kind: 'binary', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (this.atOp('*') || this.atOp('/') || this.atOp('%')) {
      const op = this.next().value as BinaryOp;
      left = { kind: 'binary', op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.atOp('-') || this.atOp('+')) {
      const op = this.next().value as '-' | '+';
      return { kind: 'unary', op, operand: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    while (this.atOp('::')) {
      this.next();
      expr = { kind: 'cast', operand: expr, to: this.parseTypeName() };
    }
    return expr;
  }

  private parseTypeName(): string {
    const t = this.peek();
    if (t.type !== 'ident' && t.type !== 'keyword') this.fail('Expected a type name');
    this.pos++;
    let name = t.value.toLowerCase();
    // Swallow multi-word types and any precision, which this engine ignores.
    while (this.peek().type === 'ident' && ['precision', 'varying'].includes(this.peek().value)) {
      name += ' ' + this.next().value;
    }
    if (this.atPunct('(')) {
      let depth = 0;
      do {
        if (this.atPunct('(')) depth++;
        else if (this.atPunct(')')) depth--;
        this.next();
      } while (depth > 0 && this.peek().type !== 'eof');
    }
    return name;
  }

  private parsePrimary(): Expr {
    const t = this.peek();

    if (t.type === 'num') {
      this.next();
      // `7.0` is numeric in PostgreSQL even though its value is a whole
      // number, and that is what keeps `7.0 / 2` from truncating.
      const isFloat = /[.eE]/.test(t.value);
      return { kind: 'literal', value: Number(t.value), ...(isFloat ? { isFloat: true } : {}) };
    }
    if (t.type === 'string') {
      this.next();
      return { kind: 'literal', value: t.value };
    }
    if (t.type === 'param') {
      this.fail('Query parameters are not supported here — write the value directly');
    }

    if (t.type === 'keyword') {
      if (t.value === 'NULL') {
        this.next();
        return { kind: 'literal', value: null };
      }
      if (t.value === 'TRUE' || t.value === 'FALSE') {
        this.next();
        return { kind: 'literal', value: t.value === 'TRUE' };
      }
      if (t.value === 'CASE') return this.parseCase();
      if (t.value === 'CAST') return this.parseCastCall();
      if (t.value === 'EXISTS') {
        this.next();
        this.expectPunct('(');
        const select = this.parseSelectExpression();
        this.expectPunct(')');
        return { kind: 'exists', select, negated: false };
      }
      if (t.value === 'NOT') {
        this.next();
        return { kind: 'unary', op: 'not', operand: this.parseUnary() };
      }
      if (t.value === 'SELECT' || t.value === 'WITH') {
        const select = this.parseSelectExpression();
        return { kind: 'scalar-select', select };
      }
      if (t.value === 'CURRENT') {
        // CURRENT_DATE / CURRENT_TIMESTAMP arrive as idents; this is the bare
        // keyword form, which this engine does not implement.
        this.fail('Unsupported keyword in an expression');
      }
    }

    if (this.atPunct('(')) {
      this.next();
      if (this.atKeyword('SELECT', 'WITH', 'VALUES')) {
        const select = this.parseSelectExpression();
        this.expectPunct(')');
        return { kind: 'scalar-select', select };
      }
      const inner = this.parseExpr();
      this.expectPunct(')');
      return inner;
    }

    // A non-reserved keyword in value position is an ordinary name: a column
    // such as `first`, or a function whose name collides, such as LEFT(s, n).
    if (
      t.type === 'keyword' &&
      !RESERVED_IN_EXPR.has(t.value) &&
      (this.peek(1).type === 'punct' || this.peek(1).type === 'op' || this.peek(1).type === 'eof' ||
        KEYWORD_FUNCTIONS.has(t.value) || this.peek(1).type === 'keyword')
    ) {
      if (this.peek(1).type === 'punct' && this.peek(1).value === '(') {
        return this.parseFunctionCall();
      }
      this.pos++;
      return { kind: 'column', table: null, name: t.value.toLowerCase() };
    }

    if (t.type === 'ident') {
      // function(...)
      if (this.peek(1).type === 'punct' && this.peek(1).value === '(') {
        return this.parseFunctionCall();
      }
      // qualified column, possibly schema.table.column
      this.next();
      let table: string | null = null;
      let name = t.value;
      if (this.atPunct('.')) {
        this.next();
        const second = this.peek();
        if (second.type !== 'ident') this.fail('Expected a column name after "."');
        this.next();
        table = name;
        name = second.value;
        if (this.atPunct('.')) {
          // schema.table.column — drop the schema, this engine has one namespace.
          this.next();
          const third = this.peek();
          if (third.type !== 'ident') this.fail('Expected a column name after "."');
          this.next();
          table = name;
          name = third.value;
        }
      }
      return { kind: 'column', table, name, ...(t.quoted ? { quoted: true } : {}) };
    }

    this.fail('Expected a value, column or expression');
  }

  private parseCase(): Expr {
    this.expectKeyword('CASE');
    const operand = this.atKeyword('WHEN') ? null : this.parseExpr();
    const whens: { when: Expr; then: Expr }[] = [];
    while (this.eatKeyword('WHEN')) {
      const when = this.parseExpr();
      this.expectKeyword('THEN');
      whens.push({ when, then: this.parseExpr() });
    }
    if (whens.length === 0) this.fail('CASE needs at least one WHEN branch');
    const elseExpr = this.eatKeyword('ELSE') ? this.parseExpr() : null;
    this.expectKeyword('END');
    return { kind: 'case', operand, whens, else: elseExpr };
  }

  private parseCastCall(): Expr {
    this.expectKeyword('CAST');
    this.expectPunct('(');
    const operand = this.parseExpr();
    this.expectKeyword('AS');
    const to = this.parseTypeName();
    this.expectPunct(')');
    return { kind: 'cast', operand, to };
  }

  private parseFunctionCall(): Expr {
    const name = this.identifier('a function name').toLowerCase();
    this.expectPunct('(');

    let distinct = false;
    const args: Expr[] = [];

    if (this.atOp('*')) {
      // COUNT(*)
      this.next();
      args.push({ kind: 'star', table: null });
    } else if (!this.atPunct(')')) {
      distinct = this.eatKeyword('DISTINCT');
      this.eatKeyword('ALL');
      do {
        args.push(this.parseExpr());
      } while (this.eatPunct(','));
    }

    // ORDER BY inside an aggregate (string_agg) — parsed and ignored except
    // for ordering the aggregate's own input.
    let aggOrder: OrderItem[] = [];
    if (this.atKeyword('ORDER')) aggOrder = this.parseOrderBy();

    this.expectPunct(')');

    let over: WindowSpec | null = null;
    if (this.eatKeyword('OVER')) over = this.parseWindowSpec();

    return {
      kind: 'func',
      name,
      args,
      distinct,
      over,
      ...(aggOrder.length > 0 ? { aggOrder } : {}),
    };
  }

  private parseWindowSpec(): WindowSpec {
    this.expectPunct('(');
    const spec: WindowSpec = { partitionBy: [], orderBy: [], frame: null };

    if (this.eatKeyword('PARTITION')) {
      this.expectKeyword('BY');
      do {
        spec.partitionBy.push(this.parseExpr());
      } while (this.eatPunct(','));
    }

    if (this.atKeyword('ORDER')) spec.orderBy = this.parseOrderBy();

    if (this.atKeyword('ROWS', 'RANGE')) spec.frame = this.parseFrame();

    this.expectPunct(')');
    return spec;
  }

  private parseFrame(): WindowFrame {
    const units = this.next().value.toLowerCase() as 'rows' | 'range';
    if (this.eatKeyword('BETWEEN')) {
      const start = this.parseFrameBound();
      this.expectKeyword('AND');
      const end = this.parseFrameBound();
      return { units, start, end };
    }
    const start = this.parseFrameBound();
    return { units, start, end: { type: 'current-row' } };
  }

  private parseFrameBound(): FrameBound {
    if (this.eatKeyword('UNBOUNDED')) {
      if (this.eatKeyword('PRECEDING')) return { type: 'unbounded-preceding' };
      this.expectKeyword('FOLLOWING');
      return { type: 'unbounded-following' };
    }
    if (this.eatKeyword('CURRENT')) {
      if (!this.eatKeyword('ROW')) this.fail('Expected ROW after CURRENT');
      return { type: 'current-row' };
    }
    const offset = this.parseExpr();
    if (this.eatKeyword('PRECEDING')) return { type: 'preceding', offset };
    this.expectKeyword('FOLLOWING');
    return { type: 'following', offset };
  }

  /* ---------------------------------------------------------------- DML */

  private parseInsert(): InsertStmt {
    this.expectKeyword('INSERT');
    this.expectKeyword('INTO');
    const table = this.identifier('a table name');

    let columns: string[] | null = null;
    if (this.atPunct('(')) {
      this.expectPunct('(');
      columns = [];
      do {
        columns.push(this.identifier('a column name'));
      } while (this.eatPunct(','));
      this.expectPunct(')');
    }

    let values: Expr[][] | null = null;
    let select: SelectStmt | null = null;

    if (this.eatKeyword('VALUES')) {
      values = [];
      do {
        this.expectPunct('(');
        const row: Expr[] = [];
        do {
          row.push(this.parseExpr());
        } while (this.eatPunct(','));
        this.expectPunct(')');
        values.push(row);
      } while (this.eatPunct(','));
    } else if (this.atKeyword('SELECT', 'WITH')) {
      select = this.parseSelectExpression();
    } else {
      this.fail('Expected VALUES or SELECT');
    }

    const returning = this.eatKeyword('RETURNING') ? this.parseSelectList() : null;
    return { type: 'insert', table, columns, values, select, returning };
  }

  private parseUpdate(): UpdateStmt {
    this.expectKeyword('UPDATE');
    const table = this.identifier('a table name');
    let alias: string | null = null;
    if (this.eatKeyword('AS')) alias = this.identifier('an alias after AS');
    else if (this.peek().type === 'ident' && !this.atKeyword('SET')) alias = this.next().value;

    this.expectKeyword('SET');
    const assignments: { column: string; value: Expr }[] = [];
    do {
      const column = this.identifier('a column name');
      if (!this.atOp('=')) this.fail('Expected "=" in the SET clause');
      this.next();
      assignments.push({ column, value: this.parseExpr() });
    } while (this.eatPunct(','));

    const from = this.eatKeyword('FROM') ? this.parseFrom() : null;
    const where = this.eatKeyword('WHERE') ? this.parseExpr() : null;
    const returning = this.eatKeyword('RETURNING') ? this.parseSelectList() : null;
    return { type: 'update', table, alias, assignments, from, where, returning };
  }

  private parseDelete(): DeleteStmt {
    this.expectKeyword('DELETE');
    this.expectKeyword('FROM');
    const table = this.identifier('a table name');
    let alias: string | null = null;
    if (this.eatKeyword('AS')) alias = this.identifier('an alias after AS');
    else if (this.peek().type === 'ident') alias = this.next().value;

    const using = this.eatKeyword('USING') ? this.parseFrom() : null;
    const where = this.eatKeyword('WHERE') ? this.parseExpr() : null;
    const returning = this.eatKeyword('RETURNING') ? this.parseSelectList() : null;
    return { type: 'delete', table, alias, using, where, returning };
  }
}

export function parse(sql: string): Statement[] {
  return new Parser(sql).parseStatements();
}

export function parseOneStatement(sql: string): Statement {
  const statements = parse(sql);
  if (statements.length === 0) throw new SqlError('No SQL statement found');
  if (statements.length > 1) {
    throw new SqlError('Expected a single statement, but found ' + statements.length);
  }
  return statements[0] as Statement;
}
