/**
 * The three SQL roadmaps.
 *
 * Seven topics per level, the same shape as the Java major, so both render
 * through the same roadmap and topic-card components.
 */

import type { SqlLevel, SqlLevelId, SqlTopic } from '../../types/sql';

export const SQL_LEVELS: SqlLevel[] = [
  {
    id: 1,
    slug: 'basics',
    name: 'Basics',
    tagline: 'Reading one table',
    description:
      'Everything you do before a second table is involved: choosing columns, filtering rows, sorting, and summarising with the five aggregate functions. One or two concepts at a time, then combined.',
    topics: [
      {
        id: 'sql-l1-select',
        levelId: 1,
        order: 1,
        name: 'SELECT, Columns & DISTINCT',
        description: 'Choosing columns, naming them with aliases, and removing duplicate rows.',
        difficulty: 'easy',
        datasetId: 'company',
        concepts: ['SELECT', 'SELECT *', 'column list', 'AS alias', 'DISTINCT', 'arithmetic'],
      },
      {
        id: 'sql-l1-where',
        levelId: 1,
        order: 2,
        name: 'WHERE & Comparison Operators',
        description: 'Filtering rows with =, <>, <, >, <=, >= and combining tests with AND, OR, NOT.',
        difficulty: 'easy',
        datasetId: 'company',
        concepts: ['WHERE', '=', '<>', '>', '<', 'AND', 'OR', 'NOT', 'precedence'],
      },
      {
        id: 'sql-l1-patterns',
        levelId: 1,
        order: 3,
        name: 'BETWEEN, IN & LIKE',
        description: 'Range tests, set membership and pattern matching with % and _ wildcards.',
        difficulty: 'easy',
        datasetId: 'company',
        concepts: ['BETWEEN', 'IN', 'NOT IN', 'LIKE', 'NOT LIKE', 'wildcards', 'ILIKE'],
      },
      {
        id: 'sql-l1-nulls',
        levelId: 1,
        order: 4,
        name: 'NULL Handling',
        description: 'Why NULL is not zero and not an empty string, and why = NULL never matches.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['NULL', 'IS NULL', 'IS NOT NULL', 'three-valued logic', 'NULL vs 0', 'NULL vs empty string'],
      },
      {
        id: 'sql-l1-sorting',
        levelId: 1,
        order: 5,
        name: 'ORDER BY & Row Limiting',
        description: 'Sorting ascending and descending, breaking ties, and returning only the top rows.',
        difficulty: 'easy',
        datasetId: 'company',
        concepts: ['ORDER BY', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST', 'LIMIT', 'OFFSET', 'FETCH'],
      },
      {
        id: 'sql-l1-aggregates',
        levelId: 1,
        order: 6,
        name: 'COUNT, SUM, MIN, MAX & AVG',
        description: 'Summarising a whole table, and the difference COUNT(*) and COUNT(column) makes.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['COUNT(*)', 'COUNT(column)', 'COUNT(DISTINCT)', 'SUM', 'AVG', 'MIN', 'MAX'],
      },
      {
        id: 'sql-l1-tables',
        levelId: 1,
        order: 7,
        name: 'Tables, Keys & Basic DML',
        description: 'Rows, columns, primary and foreign keys, data types, and simple INSERT / UPDATE / DELETE.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['primary key', 'foreign key', 'data types', 'CREATE TABLE', 'INSERT', 'UPDATE', 'DELETE'],
      },
    ],
  },
  {
    id: 2,
    slug: 'normal',
    name: 'Normal',
    tagline: 'Combining tables and clauses',
    description:
      'Where real SQL starts: grouping, the join family, subqueries and set operations — and the judgement calls between them. Most questions here need more than one clause working together.',
    topics: [
      {
        id: 'sql-l2-grouping',
        levelId: 2,
        order: 1,
        name: 'GROUP BY & HAVING',
        description: 'Collapsing rows into groups, filtering those groups, and WHERE versus HAVING.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['GROUP BY', 'HAVING', 'WHERE vs HAVING', 'grouped columns', 'multiple group keys'],
      },
      {
        id: 'sql-l2-joins',
        levelId: 2,
        order: 2,
        name: 'INNER, LEFT & RIGHT JOIN',
        description: 'Matching rows across tables, keeping unmatched ones, and reading the NULLs that result.',
        difficulty: 'medium',
        datasetId: 'joins',
        concepts: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'ON', 'table alias', 'qualified column'],
      },
      {
        id: 'sql-l2-multijoin',
        levelId: 2,
        order: 3,
        name: 'Multi-table Joins & Duplicates',
        description: 'Three or more tables, ON versus WHERE in an outer join, and the rows a join silently multiplies.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['three-table join', 'ON vs WHERE', 'duplicate rows', 'one-to-many', 'many-to-many', 'COUNT with JOIN'],
      },
      {
        id: 'sql-l2-subqueries',
        levelId: 2,
        order: 4,
        name: 'Subqueries, IN & EXISTS',
        description: 'Queries inside queries: scalar, list and existence tests — and the NOT IN / NULL trap.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['subquery', 'scalar subquery', 'IN', 'EXISTS', 'NOT IN', 'derived table', 'second highest'],
      },
      {
        id: 'sql-l2-nullcase',
        levelId: 2,
        order: 5,
        name: 'COALESCE & CASE WHEN',
        description: 'Substituting for NULL and branching inside a query, including conditional counting.',
        difficulty: 'medium',
        datasetId: 'company',
        concepts: ['COALESCE', 'NULLIF', 'CASE WHEN', 'conditional aggregation', 'NULL arithmetic'],
      },
      {
        id: 'sql-l2-setops',
        levelId: 2,
        order: 6,
        name: 'Set Operations & Anti-joins',
        description: 'UNION versus UNION ALL, finding duplicates, and rows with no match in another table.',
        difficulty: 'medium',
        datasetId: 'sales',
        concepts: ['UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT', 'anti-join', 'LEFT JOIN IS NULL', 'duplicates'],
      },
      {
        id: 'sql-l2-datestring',
        levelId: 2,
        order: 7,
        name: 'Dates, Strings & Conditional DML',
        description: 'Filtering by date, the common string functions, and UPDATE / DELETE driven by a condition.',
        difficulty: 'medium',
        datasetId: 'sales',
        concepts: ['date filtering', 'EXTRACT', 'date_trunc', 'UPPER', 'LENGTH', 'SUBSTRING', 'conditional UPDATE', 'conditional DELETE'],
      },
    ],
  },
  {
    id: 3,
    slug: 'advanced',
    name: 'Advanced',
    tagline: 'Interview-grade queries',
    description:
      'Window functions, CTEs, correlated subqueries, schema design and the performance vocabulary a technical screen expects. Difficulty ramps inside the level rather than starting at the ceiling.',
    topics: [
      {
        id: 'sql-l3-advjoins',
        levelId: 3,
        order: 1,
        name: 'Self, CROSS & FULL OUTER Joins',
        description: 'A table joined to itself, every combination, and keeping unmatched rows from both sides.',
        difficulty: 'hard',
        datasetId: 'company',
        concepts: ['self join', 'CROSS JOIN', 'FULL OUTER JOIN', 'join comparison', 'hierarchies'],
      },
      {
        id: 'sql-l3-cte',
        levelId: 3,
        order: 2,
        name: 'Common Table Expressions',
        description: 'WITH clauses for readable multi-step queries, and RECURSIVE for hierarchies and series.',
        difficulty: 'hard',
        datasetId: 'company',
        concepts: ['WITH', 'CTE', 'recursive CTE', 'CTE + JOIN', 'readability', 'multi-step'],
      },
      {
        id: 'sql-l3-windows',
        levelId: 3,
        order: 3,
        name: 'Window Functions & Ranking',
        description: 'ROW_NUMBER, RANK, DENSE_RANK and PARTITION BY — aggregates that keep every row.',
        difficulty: 'hard',
        datasetId: 'company',
        concepts: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PARTITION BY', 'OVER', 'ties'],
      },
      {
        id: 'sql-l3-analytics',
        levelId: 3,
        order: 4,
        name: 'Running Totals, LAG & Top-N',
        description: 'Frames, moving averages, comparing a row to its neighbours, and the top row per group.',
        difficulty: 'hard',
        datasetId: 'sales',
        concepts: ['running total', 'moving average', 'LAG', 'LEAD', 'window frame', 'top-N per group'],
      },
      {
        id: 'sql-l3-corr',
        levelId: 3,
        order: 5,
        name: 'Correlated Subqueries & Conditional Aggregation',
        description: 'Subqueries that run per row, EXISTS versus NOT EXISTS, and pivoting with CASE inside aggregates.',
        difficulty: 'hard',
        datasetId: 'sales',
        concepts: ['correlated subquery', 'EXISTS', 'NOT EXISTS', 'conditional aggregation', 'pivot', 'INSERT INTO SELECT'],
      },
      {
        id: 'sql-l3-design',
        levelId: 3,
        order: 6,
        name: 'Normalization & Schema Design',
        description: '1NF, 2NF and 3NF, constraints, referential integrity and views.',
        difficulty: 'hard',
        datasetId: 'company',
        concepts: ['1NF', '2NF', '3NF', 'primary key', 'foreign key', 'unique constraint', 'referential integrity', 'views'],
      },
      {
        id: 'sql-l3-perf',
        levelId: 3,
        order: 7,
        name: 'Indexes, Transactions & Performance',
        description: 'What an index costs and buys, reading a plan, and the transaction guarantees behind ACID.',
        difficulty: 'hard',
        datasetId: 'sales',
        concepts: ['index', 'EXPLAIN', 'SELECT *', 'sargable', 'transaction', 'ACID', 'isolation level', 'ROLLBACK'],
      },
    ],
  },
];

export const SQL_LEVEL_IDS = [1, 2, 3] as const;

export const SQL_TOPICS: SqlTopic[] = SQL_LEVELS.flatMap((l) => l.topics);

const TOPIC_BY_ID = new Map(SQL_TOPICS.map((t) => [t.id, t]));
const LEVEL_BY_ID = new Map(SQL_LEVELS.map((l) => [l.id, l]));
const LEVEL_BY_SLUG = new Map(SQL_LEVELS.map((l) => [l.slug, l]));

export function getSqlLevel(id: number): SqlLevel | undefined {
  return LEVEL_BY_ID.get(id as SqlLevelId);
}

export function getSqlLevelBySlug(slug: string): SqlLevel | undefined {
  return LEVEL_BY_SLUG.get(slug as SqlLevel['slug']);
}

export function getSqlTopic(id: string): SqlTopic | undefined {
  return TOPIC_BY_ID.get(id);
}

export function sqlTopicsForLevel(levelId: number): SqlTopic[] {
  return getSqlLevel(levelId)?.topics ?? [];
}

/** Levels are a fixed trio; this keeps the cast in one place. */
export function asSqlLevelId(value: string | number | undefined): SqlLevelId | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
}
