/**
 * Value semantics: three-valued logic, type coercion and ordering.
 *
 * Getting NULL right is the whole point of several lessons in this module, so
 * these rules are implemented deliberately rather than falling back on
 * JavaScript's own coercions:
 *
 *  - any comparison with NULL yields NULL (unknown), never false
 *  - NULL AND false is false; NULL OR true is true
 *  - ORDER BY places NULLs last ascending, first descending (PostgreSQL)
 *  - COUNT(column) skips NULLs; COUNT(*) does not
 */

import type { SqlValue } from './ast';
import { SqlError } from './tokens';

export type Bool3 = true | false | null;

export function isNull(v: SqlValue): v is null {
  return v === null || v === undefined;
}

/** ISO date (YYYY-MM-DD, optionally with a time part). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/;

export function isDateString(v: SqlValue): v is string {
  return typeof v === 'string' && DATE_RE.test(v);
}

export function toNumber(v: SqlValue, context = 'a numeric value'): number | null {
  if (isNull(v)) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const trimmed = v.trim();
  if (trimmed === '') throw new SqlError(`Cannot use an empty string as ${context}`);
  const n = Number(trimmed);
  if (Number.isNaN(n)) throw new SqlError(`Cannot use ${JSON.stringify(v)} as ${context}`);
  return n;
}

export function toText(v: SqlValue): string | null {
  if (isNull(v)) return null;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return formatNumber(v);
  return v;
}

export function toBool(v: SqlValue): Bool3 {
  if (isNull(v)) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = v.trim().toLowerCase();
  if (['true', 't', 'yes', 'y', '1', 'on'].includes(s)) return true;
  if (['false', 'f', 'no', 'n', '0', 'off'].includes(s)) return false;
  throw new SqlError(`Cannot use ${JSON.stringify(v)} as a boolean`);
}

/** Trailing zeros are dropped so 10.0 and 10 render and compare alike. */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Guard against binary float noise such as 0.30000000000000004.
  const rounded = Number(n.toFixed(10));
  return String(rounded);
}

/**
 * Three-valued comparison. Returns null when either side is NULL, which is
 * what makes `WHERE department_id = NULL` match nothing.
 */
export function compareValues(a: SqlValue, b: SqlValue): number | null {
  if (isNull(a) || isNull(b)) return null;

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    const ab = toBool(a) ? 1 : 0;
    const bb = toBool(b) ? 1 : 0;
    return ab - bb;
  }

  if (typeof a === 'number' || typeof b === 'number') {
    // A numeric operand forces numeric comparison, as PostgreSQL would after
    // implicitly casting the literal.
    const an = toNumber(a);
    const bn = toNumber(b);
    if (an === null || bn === null) return null;
    return an < bn ? -1 : an > bn ? 1 : 0;
  }

  const as = String(a);
  const bs = String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

/** Equality used by DISTINCT, GROUP BY and set operations: NULL equals NULL. */
export function valuesIdentical(a: SqlValue, b: SqlValue): boolean {
  if (isNull(a) && isNull(b)) return true;
  if (isNull(a) || isNull(b)) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    const an = toNumber(a);
    const bn = toNumber(b);
    return an !== null && bn !== null && an === bn;
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') return toBool(a) === toBool(b);
  return String(a) === String(b);
}

/** Stable grouping key with NULL distinguishable from the string "null". */
export function groupKey(values: readonly SqlValue[]): string {
  return values
    .map((v) => {
      if (isNull(v)) return ' NULL';
      if (typeof v === 'number') return 'n:' + formatNumber(v);
      if (typeof v === 'boolean') return 'b:' + (v ? '1' : '0');
      // A numeric-looking string groups with the number of the same value,
      // matching how these datasets are typed.
      const n = Number(v);
      if (v.trim() !== '' && !Number.isNaN(n)) return 'n:' + formatNumber(n);
      return 's:' + v;
    })
    .join('');
}

/** ORDER BY comparison, including the NULLS FIRST/LAST placement. */
export function orderCompare(
  a: SqlValue,
  b: SqlValue,
  direction: 'asc' | 'desc',
  nulls: 'first' | 'last'
): number {
  const aNull = isNull(a);
  const bNull = isNull(b);
  if (aNull && bNull) return 0;
  if (aNull) return nulls === 'first' ? -1 : 1;
  if (bNull) return nulls === 'first' ? 1 : -1;

  const cmp = compareValues(a, b) ?? 0;
  return direction === 'desc' ? -cmp : cmp;
}

/* ------------------------------------------------------------ 3-valued ops */

export function and3(a: Bool3, b: Bool3): Bool3 {
  if (a === false || b === false) return false;
  if (a === null || b === null) return null;
  return true;
}

export function or3(a: Bool3, b: Bool3): Bool3 {
  if (a === true || b === true) return true;
  if (a === null || b === null) return null;
  return false;
}

export function not3(a: Bool3): Bool3 {
  return a === null ? null : !a;
}

/** A WHERE/HAVING/ON clause keeps a row only when the predicate is true. */
export function isTruthy(v: Bool3): boolean {
  return v === true;
}

/* ------------------------------------------------------------------ LIKE */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Translates a SQL LIKE pattern into a regular expression.
 * `%` matches any run of characters, `_` exactly one.
 */
export function likeToRegExp(pattern: string, caseInsensitive: boolean, escape = '\\'): RegExp {
  let out = '^';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] as string;
    if (escape && c === escape && i + 1 < pattern.length) {
      out += escapeRegExp(pattern[i + 1] as string);
      i++;
      continue;
    }
    if (c === '%') out += '[\\s\\S]*';
    else if (c === '_') out += '[\\s\\S]';
    else out += escapeRegExp(c);
  }
  out += '$';
  return new RegExp(out, caseInsensitive ? 'i' : '');
}

/* ----------------------------------------------------------------- casting */

export function castValue(v: SqlValue, type: string): SqlValue {
  if (isNull(v)) return null;
  const t = type.toLowerCase();

  if (['int', 'integer', 'bigint', 'smallint', 'int4', 'int8'].includes(t)) {
    const n = toNumber(v);
    return n === null ? null : Math.trunc(n);
  }
  if (['numeric', 'decimal', 'real', 'double precision', 'float', 'float8'].includes(t)) {
    return toNumber(v);
  }
  if (['text', 'varchar', 'character varying', 'char', 'character'].includes(t)) {
    return toText(v);
  }
  if (['bool', 'boolean'].includes(t)) return toBool(v);
  if (t === 'date') {
    const s = toText(v);
    return s === null ? null : s.slice(0, 10);
  }
  if (['timestamp', 'timestamptz'].includes(t)) return toText(v);

  throw new SqlError(`Unsupported cast target: ${type}`);
}

/** How a value is shown in the result grid. */
export function displayValue(v: SqlValue): string {
  if (isNull(v)) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return formatNumber(v);
  return v;
}
