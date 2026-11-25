/**
 * SQL tokenizer.
 *
 * Hand-rolled like the rest of this project's infrastructure (charts, syntax
 * highlighter) so the learning module needs no WASM database and works
 * offline. It covers the PostgreSQL surface the question bank actually uses;
 * anything outside that raises a parse error rather than being silently
 * mis-read, which is the behaviour a learner needs.
 */

export type TokenType = 'num' | 'string' | 'ident' | 'keyword' | 'op' | 'punct' | 'param' | 'eof';

export interface Token {
  type: TokenType;
  /** Canonical text: keywords upper-cased, quoted identifiers unwrapped. */
  value: string;
  /** Exactly as it appeared, for error messages. */
  raw: string;
  /** True when the identifier was double-quoted, so it is case-sensitive. */
  quoted?: boolean;
  start: number;
  end: number;
  line: number;
}

export class SqlError extends Error {
  readonly position: number;
  readonly line: number;
  constructor(message: string, position = 0, line = 1) {
    super(message);
    this.name = 'SqlError';
    this.position = position;
    this.line = line;
  }
}

/** Reserved words the parser branches on. Function names are not in here. */
export const KEYWORDS = new Set([
  'ALL', 'AND', 'ANY', 'AS', 'ASC', 'BETWEEN', 'BY', 'CASE', 'CAST', 'CROSS', 'CURRENT',
  'DELETE', 'DESC', 'DISTINCT', 'ELSE', 'END', 'ESCAPE', 'EXCEPT', 'EXISTS', 'FALSE', 'FETCH',
  'FIRST', 'FOLLOWING', 'FROM', 'FULL', 'GROUP', 'HAVING', 'ILIKE', 'IN', 'INNER', 'INSERT',
  'INTERSECT', 'INTO', 'IS', 'JOIN', 'LAST', 'LEFT', 'LIKE', 'LIMIT', 'NATURAL', 'NEXT', 'NOT',
  'NULL', 'NULLS', 'OFFSET', 'ON', 'ONLY', 'OR', 'ORDER', 'OUTER', 'OVER', 'PARTITION',
  'PRECEDING', 'RANGE', 'RECURSIVE', 'RETURNING', 'RIGHT', 'ROW', 'ROWS', 'SELECT', 'SET',
  'SOME', 'THEN', 'TRUE', 'UNBOUNDED', 'UNION', 'UPDATE', 'USING', 'VALUES', 'WHEN', 'WHERE',
  'WITH',
]);

/** Multi-character operators, longest first so `<=` beats `<`. */
const OPERATORS = ['<>', '!=', '<=', '>=', '||', '::', '<', '>', '=', '+', '-', '*', '/', '%'];

const PUNCT = new Set(['(', ')', ',', ';', '.']);

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isIdentStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_$]/.test(c);
}

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  const n = sql.length;

  const push = (type: TokenType, value: string, start: number, extra?: Partial<Token>) => {
    tokens.push({ type, value, raw: sql.slice(start, i), start, end: i, line, ...extra });
  };

  while (i < n) {
    const c = sql[i] as string;

    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // -- line comment
    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }

    // /* block comment */ — PostgreSQL allows nesting.
    if (c === '/' && sql[i + 1] === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          if (sql[i] === '\n') line++;
          i++;
        }
      }
      if (depth > 0) throw new SqlError('Unterminated block comment', i, line);
      continue;
    }

    // 'string literal', with '' as an escaped quote.
    if (c === "'") {
      const start = i;
      const startLine = line;
      i++;
      let value = '';
      let closed = false;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            value += "'";
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        if (sql[i] === '\n') line++;
        value += sql[i];
        i++;
      }
      if (!closed) {
        throw new SqlError('Unterminated string literal — a quote is missing', start, startLine);
      }
      push('string', value, start);
      continue;
    }

    // "quoted identifier" — case-sensitive, unlike a bare one.
    if (c === '"') {
      const start = i;
      i++;
      let value = '';
      let closed = false;
      while (i < n) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        value += sql[i];
        i++;
      }
      if (!closed) throw new SqlError('Unterminated quoted identifier', start, line);
      push('ident', value, start, { quoted: true });
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(sql[i + 1] ?? ''))) {
      const start = i;
      while (i < n && isDigit(sql[i] as string)) i++;
      if (sql[i] === '.' && isDigit(sql[i + 1] ?? '')) {
        i++;
        while (i < n && isDigit(sql[i] as string)) i++;
      }
      if (sql[i] === 'e' || sql[i] === 'E') {
        const save = i;
        i++;
        if (sql[i] === '+' || sql[i] === '-') i++;
        if (isDigit(sql[i] ?? '')) while (i < n && isDigit(sql[i] as string)) i++;
        else i = save;
      }
      push('num', sql.slice(start, i), start);
      continue;
    }

    if (isIdentStart(c)) {
      const start = i;
      while (i < n && isIdentPart(sql[i] as string)) i++;
      const word = sql.slice(start, i);
      const upper = word.toUpperCase();
      // Bare identifiers fold to lower case in PostgreSQL.
      if (KEYWORDS.has(upper)) push('keyword', upper, start);
      else push('ident', word.toLowerCase(), start);
      continue;
    }

    if (c === '$' && isDigit(sql[i + 1] ?? '')) {
      const start = i;
      i++;
      while (i < n && isDigit(sql[i] as string)) i++;
      push('param', sql.slice(start, i), start);
      continue;
    }

    if (PUNCT.has(c)) {
      const start = i;
      i++;
      push('punct', c, start);
      continue;
    }

    const op = OPERATORS.find((o) => sql.startsWith(o, i));
    if (op) {
      const start = i;
      i += op.length;
      push('op', op, start);
      continue;
    }

    throw new SqlError(`Unexpected character ${JSON.stringify(c)}`, i, line);
  }

  tokens.push({ type: 'eof', value: '', raw: '', start: n, end: n, line });
  return tokens;
}
