/**
 * Minimal, dependency-free syntax highlighter.
 *
 * A full grammar would be overkill here: snippets are short, self-contained
 * and known to be valid, so a single-pass tokenizer over comments, strings,
 * numbers, keywords and identifiers covers everything the question banks
 * show. Keeping it local avoids pulling a ~200KB highlighter into the bundle.
 *
 * It lives in `lib` rather than beside `CodeBlock` because the SQL editor
 * paints the same tokens behind its textarea.
 */

import type { CodeLang } from '../types';

export type TokenClass = 'comment' | 'keyword' | 'string' | 'number' | 'type' | 'fn' | 'plain';

export interface Token {
  text: string;
  cls: TokenClass;
}

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'record', 'return', 'sealed', 'short',
  'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'var', 'void', 'volatile', 'while', 'yield', 'true', 'false', 'null',
]);

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'full', 'outer', 'cross', 'on',
  'group', 'by', 'having', 'order', 'asc', 'desc', 'limit', 'offset', 'distinct', 'as', 'and',
  'or', 'not', 'is', 'null', 'in', 'exists', 'between', 'like', 'ilike', 'case', 'when', 'then',
  'else', 'end', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table',
  'union', 'all', 'with', 'recursive', 'over', 'partition', 'rows', 'range', 'preceding',
  'following', 'unbounded', 'current', 'row', 'nulls', 'first', 'last', 'except', 'intersect',
  'using', 'returning', 'primary', 'key', 'foreign', 'references', 'unique', 'constraint',
  'index', 'view', 'begin', 'commit', 'rollback', 'explain', 'analyze', 'true', 'false', 'any',
  'some', 'fetch', 'next', 'only', 'escape', 'natural',
]);

const SQL_FUNCTIONS = new Set([
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'round', 'cast', 'nullif', 'greatest', 'least',
  'upper', 'lower', 'length', 'char_length', 'trim', 'ltrim', 'rtrim', 'substring', 'substr',
  'concat', 'concat_ws', 'replace', 'position', 'strpos', 'initcap', 'lpad', 'rpad', 'abs',
  'ceil', 'ceiling', 'floor', 'trunc', 'mod', 'power', 'sqrt', 'extract', 'date_part',
  'date_trunc', 'to_char', 'row_number', 'rank', 'dense_rank', 'percent_rank', 'cume_dist',
  'ntile', 'lag', 'lead', 'first_value', 'last_value', 'nth_value', 'string_agg', 'array_agg',
]);

const TS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from',
  'export', 'default', 'class', 'extends', 'new', 'typeof', 'instanceof', 'async', 'await',
  'try', 'catch', 'finally', 'throw', 'interface', 'type', 'true', 'false', 'null', 'undefined',
]);

/** Matches, in priority order: comments, strings/chars, numbers, words, other. */
const PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|--[^\n]*|#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?[dDfFlL]?\b)|([A-Za-z_$][\w$]*)|([\s\S])/g;

function classify(word: string, lang: CodeLang, nextChar: string): TokenClass {
  const lower = word.toLowerCase();

  if (lang === 'sql') {
    if (SQL_KEYWORDS.has(lower)) return 'keyword';
    if (SQL_FUNCTIONS.has(lower)) return 'fn';
    return 'plain';
  }

  const keywords = lang === 'java' ? JAVA_KEYWORDS : TS_KEYWORDS;
  if (keywords.has(word)) return 'keyword';
  // A call site reads as a function; an initial capital reads as a type. Both
  // are heuristics, but they are the right ones ~always in idiomatic Java.
  if (nextChar === '(') return 'fn';
  if (/^[A-Z]/.test(word)) return 'type';
  return 'plain';
}

function tokenize(code: string, lang: CodeLang): Token[] {
  const tokens: Token[] = [];
  const push = (text: string, cls: TokenClass) => {
    const last = tokens[tokens.length - 1];
    if (last && last.cls === cls) last.text += text;
    else tokens.push({ text, cls });
  };

  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATTERN.exec(code)) !== null) {
    const [raw, comment, str, num, word] = match;
    if (comment) push(comment, 'comment');
    else if (str) push(str, 'string');
    else if (num) push(num, 'number');
    else if (word) {
      let i = PATTERN.lastIndex;
      while (i < code.length && code[i] === ' ') i++;
      push(word, classify(word, lang, code[i] ?? ''));
    } else push(raw, 'plain');
  }
  return tokens;
}

/**
 * Tokenized source, split into lines. Exported so the SQL editor can paint
 * the same highlighting behind its textarea without a second tokenizer.
 */
export function highlightLines(code: string, lang: CodeLang): Token[][] {
  const tokens = tokenize(code, lang);
  const out: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) out.push([]);
      if (part) (out[out.length - 1] as Token[]).push({ text: part, cls: token.cls });
    });
  }
  return out;
}
