/**
 * Public entry point for the SQL engine.
 *
 * Everything a learner types goes through `runSql`, which is the single place
 * the safety policy is applied:
 *
 *  - the query runs against a *copy* of the exercise dataset, built fresh for
 *    this call, so nothing it does can be seen by another exercise or attempt
 *  - read-only exercises reject INSERT / UPDATE / DELETE before execution, so
 *    the rule is enforced by the engine rather than hidden in the UI
 *  - step, row and wall-clock budgets stop a runaway cross product or a
 *    non-terminating recursive CTE from freezing the page
 *  - there is no filesystem, network, extension or administrative surface to
 *    reach in the first place: the engine is a pure function over arrays
 *
 * Nothing here can touch the application's own stored progress: the engine
 * never sees `localStorage` and is handed only the dataset rows.
 */

import type { SqlValue, Statement } from './ast';
import { buildDatabase, type SqlDataset } from './database';
import {
  DEFAULT_LIMITS,
  executeStatement,
  type Database,
  type ExecuteLimits,
  type ResultSet,
} from './execute';
import { parse } from './parser';
import { SqlError } from './tokens';

export type { SqlValue } from './ast';
export type { ResultSet, Database, ExecuteLimits } from './execute';
export type { SqlDataset, TableDef, ColumnDef, ColumnType } from './database';
export { buildDatabase, combineDatasets, datasetTable, schemaDdl } from './database';
export { compareResults, DEFAULT_COMPARE } from './compare';
export type { CompareOptions, CompareResult, MismatchKind } from './compare';
export { SqlError } from './tokens';
export { displayValue } from './values';
export { parse, parseOneStatement } from './parser';

/** What a given exercise is allowed to execute. */
export type SqlPermission = 'read-only' | 'read-write';

export interface RunOptions {
  permission?: SqlPermission;
  limits?: Partial<ExecuteLimits>;
  /** Cap on rows handed back to the UI; the full count is still reported. */
  maxDisplayRows?: number;
}

export interface RunOutcome {
  ok: boolean;
  /** Result of the last statement, when the run succeeded. */
  result?: ResultSet;
  /** Rows actually returned, after `maxDisplayRows` truncation. */
  truncated?: boolean;
  totalRows?: number;
  error?: string;
  /** 1-based line the error was found on, when known. */
  errorLine?: number;
  elapsedMs: number;
  /** Number of statements executed. */
  statementCount: number;
}

const WRITE_COMMANDS = new Set(['insert', 'update', 'delete']);

const DEFAULT_MAX_DISPLAY_ROWS = 500;

function describeStatement(stmt: Statement): string {
  return stmt.type;
}

/**
 * Parses and runs SQL against a throwaway copy of `dataset`.
 *
 * Never throws for a bad query: a parse or execution failure comes back as
 * `{ ok: false, error }` so the editor can show it as feedback.
 */
export function runSql(dataset: SqlDataset, sql: string, options: RunOptions = {}): RunOutcome {
  const started = Date.now();
  const permission = options.permission ?? 'read-only';
  const maxDisplayRows = options.maxDisplayRows ?? DEFAULT_MAX_DISPLAY_ROWS;
  const limits: ExecuteLimits = { ...DEFAULT_LIMITS, ...options.limits };

  if (!sql.trim()) {
    return {
      ok: false,
      error: 'Write a query first.',
      elapsedMs: 0,
      statementCount: 0,
    };
  }

  let statements: Statement[];
  try {
    statements = parse(sql);
  } catch (err) {
    return errorOutcome(err, started, 0);
  }

  if (statements.length === 0) {
    return { ok: false, error: 'No SQL statement found.', elapsedMs: 0, statementCount: 0 };
  }

  if (permission === 'read-only') {
    const offending = statements.find((s) => WRITE_COMMANDS.has(describeStatement(s)));
    if (offending) {
      return {
        ok: false,
        error: `This exercise is read-only, so ${describeStatement(offending).toUpperCase()} is not allowed here. Answer it with a SELECT.`,
        elapsedMs: Date.now() - started,
        statementCount: 0,
      };
    }
  }

  // A fresh database per run: the learner's writes live and die with this call.
  const db: Database = buildDatabase(dataset);

  let last: ResultSet | undefined;
  try {
    for (const stmt of statements) {
      last = executeStatement(db, stmt, limits);
    }
  } catch (err) {
    return errorOutcome(err, started, statements.length);
  }

  const result = last as ResultSet;
  const totalRows = result.rows.length;
  const truncated = totalRows > maxDisplayRows;

  return {
    ok: true,
    result: truncated ? { ...result, rows: result.rows.slice(0, maxDisplayRows) } : result,
    truncated,
    totalRows,
    elapsedMs: Date.now() - started,
    statementCount: statements.length,
  };
}

function errorOutcome(err: unknown, started: number, statementCount: number): RunOutcome {
  if (err instanceof SqlError) {
    return {
      ok: false,
      error: err.message,
      errorLine: err.line,
      elapsedMs: Date.now() - started,
      statementCount,
    };
  }
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'The query could not be run.',
    elapsedMs: Date.now() - started,
    statementCount,
  };
}

/**
 * Runs a trusted reference query. Used by the grader and the verification
 * script to produce the expected result from the same engine the learner's
 * query runs on, so an exercise can never expect something unachievable.
 */
export function runReference(dataset: SqlDataset, sql: string): ResultSet {
  const outcome = runSql(dataset, sql, {
    permission: 'read-write',
    maxDisplayRows: Number.MAX_SAFE_INTEGER,
  });
  if (!outcome.ok || !outcome.result) {
    throw new SqlError(outcome.error ?? 'The reference query failed to run');
  }
  return outcome.result;
}

/** Convenience for lesson tables: run a snippet and get plain rows back. */
export function previewQuery(
  dataset: SqlDataset,
  sql: string
): { columns: string[]; rows: SqlValue[][] } | { error: string } {
  const outcome = runSql(dataset, sql, { maxDisplayRows: 50 });
  if (!outcome.ok || !outcome.result) return { error: outcome.error ?? 'Query failed' };
  return { columns: outcome.result.columns, rows: outcome.result.rows };
}
