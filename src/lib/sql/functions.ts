/**
 * Scalar functions.
 *
 * A deliberately small, PostgreSQL-shaped library: the string, numeric, date
 * and NULL-handling functions the question bank actually teaches. Calling
 * anything outside this table raises a clear "unknown function" error rather
 * than returning NULL, so a learner's typo is reported as a typo.
 */

import type { SqlValue } from './ast';
import { SqlError } from './tokens';
import { formatNumber, isNull, toNumber, toText } from './values';

export type ScalarFn = (args: SqlValue[]) => SqlValue;

function num(v: SqlValue, fn: string): number | null {
  return toNumber(v, `an argument to ${fn}()`);
}

function requireArgs(name: string, args: SqlValue[], min: number, max = min): void {
  if (args.length < min || args.length > max) {
    const expected = min === max ? `${min}` : `${min}-${max}`;
    throw new SqlError(`${name}() expects ${expected} argument(s), got ${args.length}`);
  }
}

/** Parses an ISO date into UTC milliseconds; throws on anything unparseable. */
function dateMs(v: SqlValue, fn: string): number | null {
  if (isNull(v)) return null;
  const s = toText(v) as string;
  const ms = Date.parse(s.includes('T') || s.includes(' ') ? s.replace(' ', 'T') + 'Z' : s + 'T00:00:00Z');
  if (Number.isNaN(ms)) throw new SqlError(`${fn}() could not read ${JSON.stringify(s)} as a date`);
  return ms;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const SCALAR_FUNCTIONS: Record<string, ScalarFn> = {
  /* ------------------------------------------------------------- NULL */

  coalesce: (args) => {
    if (args.length === 0) throw new SqlError('coalesce() needs at least one argument');
    for (const a of args) if (!isNull(a)) return a;
    return null;
  },

  nullif: (args) => {
    requireArgs('nullif', args, 2);
    const [a, b] = args as [SqlValue, SqlValue];
    if (isNull(a) || isNull(b)) return a;
    return String(a) === String(b) ? null : a;
  },

  greatest: (args) => {
    const present = args.filter((a) => !isNull(a));
    if (present.length === 0) return null;
    return present.reduce((best, v) => ((num(v, 'greatest') ?? 0) > (num(best, 'greatest') ?? 0) ? v : best));
  },

  least: (args) => {
    const present = args.filter((a) => !isNull(a));
    if (present.length === 0) return null;
    return present.reduce((best, v) => ((num(v, 'least') ?? 0) < (num(best, 'least') ?? 0) ? v : best));
  },

  /* ----------------------------------------------------------- string */

  upper: (args) => {
    requireArgs('upper', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.toUpperCase();
  },

  lower: (args) => {
    requireArgs('lower', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.toLowerCase();
  },

  length: (args) => {
    requireArgs('length', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.length;
  },

  char_length: (args) => (SCALAR_FUNCTIONS.length as ScalarFn)(args),
  character_length: (args) => (SCALAR_FUNCTIONS.length as ScalarFn)(args),

  trim: (args) => {
    requireArgs('trim', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.trim();
  },

  ltrim: (args) => {
    requireArgs('ltrim', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.replace(/^\s+/, '');
  },

  rtrim: (args) => {
    requireArgs('rtrim', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null ? null : s.replace(/\s+$/, '');
  },

  // PostgreSQL substring is 1-based and clamps at the start of the string.
  substring: (args) => {
    requireArgs('substring', args, 2, 3);
    const s = toText(args[0] as SqlValue);
    if (s === null) return null;
    const from = num(args[1] as SqlValue, 'substring');
    if (from === null) return null;
    const start = Math.max(1, Math.trunc(from));
    if (args.length === 2) return s.slice(start - 1);
    const count = num(args[2] as SqlValue, 'substring');
    if (count === null) return null;
    if (count < 0) throw new SqlError('substring() was given a negative length');
    return s.slice(start - 1, start - 1 + Math.trunc(count));
  },

  substr: (args) => (SCALAR_FUNCTIONS.substring as ScalarFn)(args),

  left: (args) => {
    requireArgs('left', args, 2);
    const s = toText(args[0] as SqlValue);
    const n = num(args[1] as SqlValue, 'left');
    if (s === null || n === null) return null;
    return n >= 0 ? s.slice(0, Math.trunc(n)) : s.slice(0, Math.max(0, s.length + Math.trunc(n)));
  },

  right: (args) => {
    requireArgs('right', args, 2);
    const s = toText(args[0] as SqlValue);
    const n = num(args[1] as SqlValue, 'right');
    if (s === null || n === null) return null;
    if (n <= 0) return '';
    return s.slice(Math.max(0, s.length - Math.trunc(n)));
  },

  concat: (args) => args.map((a) => toText(a) ?? '').join(''),

  concat_ws: (args) => {
    if (args.length === 0) throw new SqlError('concat_ws() needs a separator');
    const sep = toText(args[0] as SqlValue);
    if (sep === null) return null;
    return args
      .slice(1)
      .filter((a) => !isNull(a))
      .map((a) => toText(a) as string)
      .join(sep);
  },

  replace: (args) => {
    requireArgs('replace', args, 3);
    const [s, find, into] = args.map((a) => toText(a));
    if (s === null || find === null || into === null) return null;
    return find === '' ? s : s.split(find).join(into);
  },

  position: (args) => {
    requireArgs('position', args, 2);
    const needle = toText(args[0] as SqlValue);
    const hay = toText(args[1] as SqlValue);
    if (needle === null || hay === null) return null;
    return hay.indexOf(needle) + 1;
  },

  strpos: (args) => {
    requireArgs('strpos', args, 2);
    const hay = toText(args[0] as SqlValue);
    const needle = toText(args[1] as SqlValue);
    if (needle === null || hay === null) return null;
    return hay.indexOf(needle) + 1;
  },

  initcap: (args) => {
    requireArgs('initcap', args, 1);
    const s = toText(args[0] as SqlValue);
    return s === null
      ? null
      : s.replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  },

  lpad: (args) => {
    requireArgs('lpad', args, 2, 3);
    const s = toText(args[0] as SqlValue);
    const width = num(args[1] as SqlValue, 'lpad');
    const fill = args.length === 3 ? (toText(args[2] as SqlValue) ?? ' ') : ' ';
    if (s === null || width === null) return null;
    const w = Math.trunc(width);
    if (s.length >= w) return s.slice(0, w);
    return (fill.repeat(Math.ceil((w - s.length) / Math.max(1, fill.length))) + s).slice(-w);
  },

  rpad: (args) => {
    requireArgs('rpad', args, 2, 3);
    const s = toText(args[0] as SqlValue);
    const width = num(args[1] as SqlValue, 'rpad');
    const fill = args.length === 3 ? (toText(args[2] as SqlValue) ?? ' ') : ' ';
    if (s === null || width === null) return null;
    const w = Math.trunc(width);
    if (s.length >= w) return s.slice(0, w);
    return (s + fill.repeat(Math.ceil((w - s.length) / Math.max(1, fill.length)))).slice(0, w);
  },

  /* ---------------------------------------------------------- numeric */

  abs: (args) => {
    requireArgs('abs', args, 1);
    const n = num(args[0] as SqlValue, 'abs');
    return n === null ? null : Math.abs(n);
  },

  // PostgreSQL rounds halves away from zero; JavaScript rounds them up.
  round: (args) => {
    requireArgs('round', args, 1, 2);
    const n = num(args[0] as SqlValue, 'round');
    if (n === null) return null;
    const places = args.length === 2 ? num(args[1] as SqlValue, 'round') : 0;
    if (places === null) return null;
    const factor = Math.pow(10, Math.trunc(places));
    const scaled = n * factor;
    const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
    return Number((rounded / factor).toFixed(Math.max(0, Math.trunc(places))));
  },

  ceil: (args) => {
    requireArgs('ceil', args, 1);
    const n = num(args[0] as SqlValue, 'ceil');
    return n === null ? null : Math.ceil(n);
  },
  ceiling: (args) => (SCALAR_FUNCTIONS.ceil as ScalarFn)(args),

  floor: (args) => {
    requireArgs('floor', args, 1);
    const n = num(args[0] as SqlValue, 'floor');
    return n === null ? null : Math.floor(n);
  },

  trunc: (args) => {
    requireArgs('trunc', args, 1, 2);
    const n = num(args[0] as SqlValue, 'trunc');
    if (n === null) return null;
    const places = args.length === 2 ? (num(args[1] as SqlValue, 'trunc') ?? 0) : 0;
    const factor = Math.pow(10, Math.trunc(places));
    return Math.trunc(n * factor) / factor;
  },

  mod: (args) => {
    requireArgs('mod', args, 2);
    const a = num(args[0] as SqlValue, 'mod');
    const b = num(args[1] as SqlValue, 'mod');
    if (a === null || b === null) return null;
    if (b === 0) throw new SqlError('division by zero');
    return a % b;
  },

  power: (args) => {
    requireArgs('power', args, 2);
    const a = num(args[0] as SqlValue, 'power');
    const b = num(args[1] as SqlValue, 'power');
    return a === null || b === null ? null : Math.pow(a, b);
  },

  sqrt: (args) => {
    requireArgs('sqrt', args, 1);
    const n = num(args[0] as SqlValue, 'sqrt');
    if (n === null) return null;
    if (n < 0) throw new SqlError('cannot take the square root of a negative number');
    return Math.sqrt(n);
  },

  /* ------------------------------------------------------------- date */

  extract: (args) => {
    requireArgs('extract', args, 2);
    const field = (toText(args[0] as SqlValue) ?? '').toLowerCase();
    const ms = dateMs(args[1] as SqlValue, 'extract');
    if (ms === null) return null;
    const d = new Date(ms);
    switch (field) {
      case 'year':
        return d.getUTCFullYear();
      case 'month':
        return d.getUTCMonth() + 1;
      case 'day':
        return d.getUTCDate();
      case 'hour':
        return d.getUTCHours();
      case 'minute':
        return d.getUTCMinutes();
      case 'second':
        return d.getUTCSeconds();
      case 'dow':
        return d.getUTCDay();
      case 'quarter':
        return Math.floor(d.getUTCMonth() / 3) + 1;
      default:
        throw new SqlError(`extract() does not support the field ${JSON.stringify(field)}`);
    }
  },

  date_part: (args) => (SCALAR_FUNCTIONS.extract as ScalarFn)(args),

  date_trunc: (args) => {
    requireArgs('date_trunc', args, 2);
    const unit = (toText(args[0] as SqlValue) ?? '').toLowerCase();
    const ms = dateMs(args[1] as SqlValue, 'date_trunc');
    if (ms === null) return null;
    const d = new Date(ms);
    if (unit === 'year') return `${d.getUTCFullYear()}-01-01`;
    if (unit === 'month') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
    if (unit === 'day') return isoDate(ms);
    throw new SqlError(`date_trunc() does not support the unit ${JSON.stringify(unit)}`);
  },

  age_in_days: (args) => {
    requireArgs('age_in_days', args, 2);
    const a = dateMs(args[0] as SqlValue, 'age_in_days');
    const b = dateMs(args[1] as SqlValue, 'age_in_days');
    if (a === null || b === null) return null;
    return Math.round((a - b) / 86_400_000);
  },

  to_char: (args) => {
    requireArgs('to_char', args, 2);
    const value = args[0] as SqlValue;
    const fmt = toText(args[1] as SqlValue);
    if (isNull(value) || fmt === null) return null;
    const ms = dateMs(value, 'to_char');
    if (ms === null) return null;
    const d = new Date(ms);
    return fmt
      .replace(/YYYY/g, String(d.getUTCFullYear()))
      .replace(/MM/g, pad(d.getUTCMonth() + 1))
      .replace(/DD/g, pad(d.getUTCDate()));
  },

  /* ------------------------------------------------------------ other */

  format_number: (args) => {
    requireArgs('format_number', args, 1);
    const n = num(args[0] as SqlValue, 'format_number');
    return n === null ? null : formatNumber(n);
  },
};

export function isScalarFunction(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCALAR_FUNCTIONS, name);
}

export function callScalar(name: string, args: SqlValue[]): SqlValue {
  const fn = SCALAR_FUNCTIONS[name];
  if (!fn) throw new SqlError(`Unknown function ${name}()`);
  return fn(args);
}

export const AGGREGATE_NAMES = new Set([
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'string_agg',
  'array_agg',
  'bool_and',
  'bool_or',
  'every',
]);

export const WINDOW_ONLY_NAMES = new Set([
  'row_number',
  'rank',
  'dense_rank',
  'percent_rank',
  'cume_dist',
  'ntile',
  'lag',
  'lead',
  'first_value',
  'last_value',
  'nth_value',
]);

export function isAggregate(name: string): boolean {
  return AGGREGATE_NAMES.has(name);
}

export function isWindowOnly(name: string): boolean {
  return WINDOW_ONLY_NAMES.has(name);
}
