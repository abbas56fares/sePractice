/**
 * Result-set comparison — how a written query is actually marked.
 *
 * Grading compares *results*, never query text, so two queries that differ in
 * formatting, alias choice or clause order both pass. The comparison is
 * deliberately strict about the things SQL itself is strict about (row
 * multiplicity, NULLs, ordering when the question asked for it) and lenient
 * about the things it is not (column labels unless requested, row order when
 * the question specified none).
 */

import type { SqlValue } from './ast';
import type { ResultSet } from './execute';
import { groupKey, isNull } from './values';

export interface CompareOptions {
  /** The question asked for a specific order, so row order is graded. */
  orderMatters: boolean;
  /** The question named the output columns, so labels are graded. */
  checkColumnNames: boolean;
  /** Tolerance for numeric values, to absorb float noise from AVG. */
  tolerance: number;
}

export const DEFAULT_COMPARE: CompareOptions = {
  orderMatters: false,
  checkColumnNames: false,
  tolerance: 1e-6,
};

export type MismatchKind =
  | 'column-count'
  | 'column-names'
  | 'row-count'
  | 'row-order'
  | 'row-values'
  | 'duplicates';

export interface CompareResult {
  match: boolean;
  kind?: MismatchKind;
  /** One sentence a learner can act on, without giving the answer away. */
  message?: string;
  /** Up to a few example rows that differ, for the feedback panel. */
  missingRows?: SqlValue[][];
  extraRows?: SqlValue[][];
}

function valuesMatch(a: SqlValue, b: SqlValue, tolerance: number): boolean {
  if (isNull(a) && isNull(b)) return true;
  if (isNull(a) || isNull(b)) return false;

  const an = typeof a === 'number' ? a : Number(a);
  const bn = typeof b === 'number' ? b : Number(b);
  const bothNumeric =
    !Number.isNaN(an) &&
    !Number.isNaN(bn) &&
    String(a).trim() !== '' &&
    String(b).trim() !== '' &&
    typeof a !== 'boolean' &&
    typeof b !== 'boolean';

  if (bothNumeric) return Math.abs(an - bn) <= tolerance * Math.max(1, Math.abs(an), Math.abs(bn));
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return String(a) === String(b);
  }
  return String(a) === String(b);
}

function rowsMatch(a: SqlValue[], b: SqlValue[], tolerance: number): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!valuesMatch(a[i] as SqlValue, b[i] as SqlValue, tolerance)) return false;
  }
  return true;
}

/** Rounds numbers to the tolerance so near-equal values share a bag key. */
function bagKey(row: SqlValue[], tolerance: number): string {
  const digits = Math.max(0, Math.min(12, Math.round(-Math.log10(tolerance))));
  return groupKey(
    row.map((v) => {
      if (isNull(v)) return null;
      const n = typeof v === 'number' ? v : Number(v);
      if (typeof v !== 'boolean' && String(v).trim() !== '' && !Number.isNaN(n)) {
        return Number(n.toFixed(digits));
      }
      return v;
    })
  );
}

export function compareResults(
  actual: ResultSet,
  expected: ResultSet,
  options: Partial<CompareOptions> = {}
): CompareResult {
  const opts = { ...DEFAULT_COMPARE, ...options };

  if (actual.columns.length !== expected.columns.length) {
    return {
      match: false,
      kind: 'column-count',
      message: `Your query returns ${actual.columns.length} column(s); ${expected.columns.length} were expected.`,
    };
  }

  if (opts.checkColumnNames) {
    const a = actual.columns.map((c) => c.toLowerCase());
    const b = expected.columns.map((c) => c.toLowerCase());
    const differing = a.findIndex((name, i) => name !== b[i]);
    if (differing >= 0) {
      return {
        match: false,
        kind: 'column-names',
        message: `Column ${differing + 1} is named "${actual.columns[differing]}" but should be "${expected.columns[differing]}". Use AS to label it.`,
      };
    }
  }

  if (actual.rows.length !== expected.rows.length) {
    const hint =
      actual.rows.length > expected.rows.length
        ? 'Too many rows — check for a join that duplicates rows, or a missing filter or DISTINCT.'
        : 'Too few rows — check whether a filter is too strict, or whether an INNER JOIN is dropping unmatched rows.';
    return {
      match: false,
      kind: 'row-count',
      message: `Your query returns ${actual.rows.length} row(s); ${expected.rows.length} were expected. ${hint}`,
    };
  }

  if (opts.orderMatters) {
    for (let i = 0; i < expected.rows.length; i++) {
      if (!rowsMatch(actual.rows[i] as SqlValue[], expected.rows[i] as SqlValue[], opts.tolerance)) {
        // Distinguish "wrong values" from "right values, wrong order".
        const sameBag = compareAsBag(actual, expected, opts);
        return sameBag.match
          ? {
              match: false,
              kind: 'row-order',
              message: `Row ${i + 1} is out of place. The right rows are there, but this question asks for a specific order — check your ORDER BY.`,
            }
          : {
              match: false,
              kind: 'row-values',
              message: `Row ${i + 1} does not match the expected result.`,
              missingRows: [expected.rows[i] as SqlValue[]],
              extraRows: [actual.rows[i] as SqlValue[]],
            };
      }
    }
    return { match: true };
  }

  return compareAsBag(actual, expected, opts);
}

/** Multiset comparison: duplicates count, order does not. */
function compareAsBag(
  actual: ResultSet,
  expected: ResultSet,
  opts: CompareOptions
): CompareResult {
  const counts = new Map<string, number>();
  for (const row of expected.rows) {
    const key = bagKey(row, opts.tolerance);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const extra: SqlValue[][] = [];
  for (const row of actual.rows) {
    const key = bagKey(row, opts.tolerance);
    const available = counts.get(key) ?? 0;
    if (available > 0) counts.set(key, available - 1);
    else extra.push(row);
  }

  if (extra.length === 0) return { match: true };

  const missing: SqlValue[][] = [];
  for (const row of expected.rows) {
    const key = bagKey(row, opts.tolerance);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) {
      missing.push(row);
      counts.set(key, remaining - 1);
    }
  }

  const duplicatesOnly =
    extra.length > 0 &&
    missing.length === 0 &&
    extra.every((row) => expected.rows.some((e) => rowsMatch(row, e, opts.tolerance)));

  return {
    match: false,
    kind: duplicatesOnly ? 'duplicates' : 'row-values',
    message: duplicatesOnly
      ? 'Your result repeats rows that should appear once. A join is probably multiplying rows — or DISTINCT is missing.'
      : `${extra.length} row(s) in your result were not expected, and ${missing.length} expected row(s) are missing.`,
    missingRows: missing.slice(0, 5),
    extraRows: extra.slice(0, 5),
  };
}
