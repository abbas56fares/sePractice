/** AST produced by the parser and consumed by the executor. */

export type Expr =
  | { kind: 'literal'; value: SqlValue; /** Written with a decimal point, so it is numeric not integer. */ isFloat?: boolean }
  | { kind: 'column'; table: string | null; name: string; quoted?: boolean }
  | { kind: 'star'; table: string | null }
  | { kind: 'unary'; op: 'not' | '-' | '+'; operand: Expr }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'isnull'; operand: Expr; negated: boolean }
  | { kind: 'between'; operand: Expr; low: Expr; high: Expr; negated: boolean }
  | { kind: 'like'; operand: Expr; pattern: Expr; negated: boolean; caseInsensitive: boolean; escape?: Expr }
  | { kind: 'in-list'; operand: Expr; list: Expr[]; negated: boolean }
  | { kind: 'in-select'; operand: Expr; select: SelectStmt; negated: boolean }
  | { kind: 'exists'; select: SelectStmt; negated: boolean }
  | { kind: 'scalar-select'; select: SelectStmt }
  | { kind: 'quantified'; op: BinaryOp; left: Expr; quantifier: 'any' | 'all'; select: SelectStmt }
  | { kind: 'case'; operand: Expr | null; whens: { when: Expr; then: Expr }[]; else: Expr | null }
  | { kind: 'cast'; operand: Expr; to: string }
  | {
      kind: 'func';
      name: string;
      args: Expr[];
      distinct: boolean;
      over: WindowSpec | null;
      /** ORDER BY inside an aggregate call, e.g. string_agg(x, ',' ORDER BY x). */
      aggOrder?: OrderItem[];
    };

export type BinaryOp =
  | '=' | '<>' | '<' | '>' | '<=' | '>='
  | '+' | '-' | '*' | '/' | '%'
  | '||' | 'and' | 'or';

export interface WindowSpec {
  partitionBy: Expr[];
  orderBy: OrderItem[];
  frame: WindowFrame | null;
}

export interface WindowFrame {
  units: 'rows' | 'range';
  start: FrameBound;
  end: FrameBound;
}

export type FrameBound =
  | { type: 'unbounded-preceding' }
  | { type: 'preceding'; offset: Expr }
  | { type: 'current-row' }
  | { type: 'following'; offset: Expr }
  | { type: 'unbounded-following' };

export interface OrderItem {
  expr: Expr;
  direction: 'asc' | 'desc';
  /** PostgreSQL default: NULLS LAST for ASC, NULLS FIRST for DESC. */
  nulls: 'first' | 'last';
}

export interface SelectItem {
  expr: Expr;
  alias: string | null;
}

export type FromItem =
  | { kind: 'table'; name: string; alias: string | null }
  | { kind: 'subquery'; select: SelectStmt; alias: string }
  | {
      kind: 'join';
      joinType: 'inner' | 'left' | 'right' | 'full' | 'cross';
      left: FromItem;
      right: FromItem;
      on: Expr | null;
      using: string[] | null;
    };

export interface Cte {
  name: string;
  columns: string[] | null;
  select: SelectStmt;
  recursive: boolean;
}

export interface SelectStmt {
  type: 'select';
  ctes: Cte[];
  distinct: boolean;
  /** DISTINCT ON (...) — PostgreSQL-specific. */
  distinctOn: Expr[] | null;
  columns: SelectItem[];
  from: FromItem | null;
  where: Expr | null;
  groupBy: Expr[];
  having: Expr | null;
  orderBy: OrderItem[];
  limit: Expr | null;
  offset: Expr | null;
  /** Set operation chained onto this select, applied left-to-right. */
  setOp: { op: 'union' | 'intersect' | 'except'; all: boolean; right: SelectStmt } | null;
  /** VALUES (...), (...) used in place of a SELECT list. */
  values: Expr[][] | null;
}

export interface InsertStmt {
  type: 'insert';
  table: string;
  columns: string[] | null;
  values: Expr[][] | null;
  select: SelectStmt | null;
  returning: SelectItem[] | null;
}

export interface UpdateStmt {
  type: 'update';
  table: string;
  alias: string | null;
  assignments: { column: string; value: Expr }[];
  from: FromItem | null;
  where: Expr | null;
  returning: SelectItem[] | null;
}

export interface DeleteStmt {
  type: 'delete';
  table: string;
  alias: string | null;
  using: FromItem | null;
  where: Expr | null;
  returning: SelectItem[] | null;
}

export type Statement = SelectStmt | InsertStmt | UpdateStmt | DeleteStmt;

/* ------------------------------------------------------------------ values */

/**
 * The value domain. `null` is SQL NULL. Dates are kept as ISO strings so
 * datasets stay plain JSON and comparisons remain lexicographic-correct.
 */
export type SqlValue = string | number | boolean | null;
