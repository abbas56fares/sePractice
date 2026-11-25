/**
 * Learning material, one lesson per topic.
 *
 * Examples are not transcribed results — every `sql` here is executed against
 * the topic's dataset when the lesson renders, so a lesson can never drift
 * out of step with the data or the engine. That also means an example which
 * is *meant* to fail (marked `expectError`) shows the real error message.
 */

import type { Lesson } from '../../types/sql';

export const SQL_LESSONS: Lesson[] = [
  /* ------------------------------------------------------------ level 1 */
  {
    topicId: 'sql-l1-select',
    definition:
      'SELECT chooses which columns come back. FROM says which table they come from. Everything else in SQL is a refinement of those two.',
    syntax: 'SELECT [DISTINCT] column_list\nFROM table_name;',
    examples: [
      {
        caption: 'Every column of every row',
        sql: 'SELECT * FROM departments;',
        note: '* means "all columns". With no WHERE clause, every row is returned.',
      },
      {
        caption: 'Just the columns you need',
        sql: 'SELECT name, salary FROM employees;',
        note: 'Output columns appear in the order you list them, not the order they sit in the table.',
      },
      {
        caption: 'Rename a column, and compute one',
        sql: 'SELECT name AS employee, salary * 12 AS annual_pay FROM employees;',
        note: 'AS labels an output column. ORDER BY can refer to these labels later; WHERE cannot, because it runs first.',
      },
      {
        caption: 'DISTINCT removes duplicate rows',
        sql: 'SELECT DISTINCT department_id FROM employees;',
        note: 'Four rows, not twelve — and note that one of them is NULL. DISTINCT keeps a single NULL rather than dropping it.',
      },
      {
        caption: 'DISTINCT applies to the whole row',
        sql: 'SELECT DISTINCT department_id, name FROM employees;',
        note: 'Adding name makes almost every row unique, so almost nothing is deduplicated. DISTINCT is never per-column.',
      },
    ],
    pitfalls: [
      {
        title: 'A missing comma becomes an alias',
        body: 'SELECT name salary FROM employees parses happily: it returns names in a column labelled salary. No error, wrong answer.',
      },
      {
        title: 'SELECT * in committed code',
        body: 'It moves columns you do not need and silently changes shape when someone adds a column. Fine for exploring, risky in an application.',
      },
    ],
    related: ['sql-l1-where', 'sql-l1-sorting'],
  },

  {
    topicId: 'sql-l1-where',
    definition:
      'WHERE keeps only the rows whose condition evaluates to true. Rows where it is false — or unknown — are discarded.',
    syntax: 'SELECT columns FROM table\nWHERE condition [AND | OR condition ...];',
    examples: [
      {
        caption: 'A single comparison',
        sql: 'SELECT name, salary FROM employees WHERE salary > 3000;',
        note: 'Ten of the twelve employees qualify. The operators are =, <>, !=, <, >, <= and >=.',
      },
      {
        caption: 'AND binds tighter than OR',
        sql: "SELECT name FROM employees WHERE department_id = 10 AND salary > 5000 OR name = 'Omar';",
        note: "Reads as (department_id = 10 AND salary > 5000) OR name = 'Omar'. Omar matches on his own, despite having no department.",
      },
      {
        caption: 'Brackets change the answer',
        sql: "SELECT name FROM employees WHERE department_id = 10 AND (salary > 5000 OR name = 'Omar');",
        note: 'Now every row must be in IT, so Omar drops out. Parenthesise whenever you mix AND and OR.',
      },
      {
        caption: 'NOT also discards the NULL rows',
        sql: 'SELECT COUNT(*) AS not_in_it FROM employees WHERE NOT department_id = 10;',
        note: 'Six, not eight. NOT (unknown) is still unknown, so the two employees with no department are dropped along with the four in IT.',
      },
    ],
    pitfalls: [
      {
        title: 'WHERE cannot see a select-list alias',
        body: 'SELECT salary * 12 AS annual ... WHERE annual > 50000 fails: WHERE runs before SELECT creates the alias. Repeat the expression, or filter outside a subquery.',
      },
      {
        title: 'Double quotes are not string quotes',
        body: 'WHERE name = "Sara" asks for a column called Sara. String literals always take single quotes.',
      },
    ],
    related: ['sql-l1-patterns', 'sql-l1-nulls', 'sql-l2-grouping'],
  },

  {
    topicId: 'sql-l1-patterns',
    definition:
      'BETWEEN tests a range, IN tests membership of a set, and LIKE matches a text pattern. All three are shorthand for conditions you could write by hand.',
    syntax:
      "x BETWEEN low AND high        -- x >= low AND x <= high\nx IN (a, b, c)                -- x = a OR x = b OR x = c\nx LIKE 'pattern'              -- % = any run, _ = exactly one",
    examples: [
      {
        caption: 'BETWEEN is inclusive at both ends',
        sql: 'SELECT name, salary FROM employees WHERE salary BETWEEN 3100 AND 3900 ORDER BY salary;',
        note: 'Both 3100 and 3900 are included. Written backwards — BETWEEN 3900 AND 3100 — it returns nothing, silently.',
      },
      {
        caption: 'IN is a chain of ORs',
        sql: 'SELECT COUNT(*) AS in_it_or_hr FROM employees WHERE department_id IN (10, 20);',
        note: 'Exactly the same rows as department_id = 10 OR department_id = 20.',
      },
      {
        caption: 'Anchored pattern',
        sql: "SELECT name FROM employees WHERE name LIKE 'A%' ORDER BY name;",
        note: '% matches any run of characters including none, so this is "starts with A".',
      },
      {
        caption: 'Underscore is exactly one character',
        sql: "SELECT name FROM employees WHERE name LIKE '____' ORDER BY name;",
        note: 'Four underscores means a name of exactly four letters.',
      },
      {
        caption: 'NOT IN with a NULL returns nothing',
        sql: 'SELECT name FROM employees WHERE department_id NOT IN (10, 20, NULL);',
        note: 'Zero rows. NOT IN expands to a chain of <> tests, and anything <> NULL is unknown — which poisons the whole chain.',
      },
    ],
    pitfalls: [
      {
        title: 'A single NULL breaks NOT IN',
        body: 'This is one of the most common real-world SQL bugs. Use NOT EXISTS, or filter the NULLs out of the list first.',
      },
      {
        title: 'LIKE is case-sensitive in PostgreSQL',
        body: "Use ILIKE, or fold both sides with LOWER(). MySQL's default collation makes LIKE case-insensitive, which is why habits do not transfer.",
      },
    ],
    related: ['sql-l1-nulls', 'sql-l2-subqueries'],
    dialectNotes: [
      { engine: 'MySQL', note: 'LIKE is case-insensitive under the default collation; there is no ILIKE.' },
      { engine: 'SQL Server', note: 'Case sensitivity depends on the column collation. ILIKE does not exist.' },
    ],
  },

  {
    topicId: 'sql-l1-nulls',
    definition:
      'NULL means "no value recorded". It is not zero and not an empty string, and any comparison involving it yields unknown rather than true or false.',
    syntax: 'x IS NULL        -- the only test that finds a NULL\nx IS NOT NULL\nCOALESCE(x, fallback)',
    examples: [
      {
        caption: '= NULL finds nothing',
        sql: 'SELECT name FROM employees WHERE department_id = NULL;',
        note: 'No rows, and no error. Unknown = unknown is unknown, and WHERE keeps only rows where the condition is true.',
      },
      {
        caption: 'IS NULL is the test that works',
        sql: 'SELECT name FROM employees WHERE department_id IS NULL ORDER BY name;',
        note: 'Dina and Omar. IS NULL is a dedicated test rather than a comparison, which is exactly why it works.',
      },
      {
        caption: 'NULL, zero and the empty string are three different things',
        sql: "SELECT LENGTH('') AS empty_len, LENGTH(NULL) AS null_len, COALESCE(NULL, 0) AS coalesced;",
        note: 'An empty string has length 0. A NULL has no length at all — the function returns NULL rather than 0.',
      },
      {
        caption: 'NULL propagates through arithmetic',
        sql: "SELECT name, salary / 2 AS half, department_id + 1 AS next_dept FROM employees WHERE name = 'Omar';",
        note: 'An unknown value plus one is still unknown. Only COALESCE makes it a number.',
      },
      {
        caption: 'The COUNT gap is the NULL count',
        sql: 'SELECT COUNT(*) AS rows_total, COUNT(department_id) AS with_department FROM employees;',
        note: 'COUNT(*) counts rows; COUNT(column) counts non-NULL values. The difference — 2 — is how many NULLs there are.',
      },
    ],
    pitfalls: [
      {
        title: 'Three-valued logic',
        body: 'false AND unknown is false. true OR unknown is true. But true AND unknown is unknown, and WHERE discards it. Unknown is not false — it is just never kept.',
      },
      {
        title: 'NULLs vanish from <> filters',
        body: 'WHERE status <> \'closed\' silently drops rows whose status is NULL. Add OR status IS NULL when you mean "everything else".',
      },
    ],
    related: ['sql-l1-aggregates', 'sql-l2-nullcase', 'sql-l2-subqueries'],
  },

  {
    topicId: 'sql-l1-sorting',
    definition:
      'ORDER BY defines the row order of a result; without it, order is unspecified. LIMIT and OFFSET then take a slice of that ordered result.',
    syntax:
      'SELECT columns FROM table\nORDER BY expr [ASC | DESC] [NULLS FIRST | NULLS LAST], ...\nLIMIT n OFFSET m;',
    examples: [
      {
        caption: 'Ascending is the default',
        sql: 'SELECT name FROM employees ORDER BY name LIMIT 5;',
        note: 'ASC is implied. Text sorts by collation order, numbers numerically, dates chronologically.',
      },
      {
        caption: 'A second key breaks ties in the first',
        sql: 'SELECT department_id, name, salary FROM employees WHERE department_id IS NOT NULL ORDER BY department_id, salary DESC;',
        note: 'Rows sort by department first; salary only matters between rows sharing a department.',
      },
      {
        caption: 'ORDER BY can use an alias',
        sql: 'SELECT name, salary * 12 AS annual FROM employees ORDER BY annual DESC LIMIT 3;',
        note: 'ORDER BY runs after SELECT, so the alias exists. WHERE runs before it, so there the alias does not.',
      },
      {
        caption: 'Top five, then the next two',
        sql: 'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 2 OFFSET 2;',
        note: 'OFFSET skips rows before LIMIT takes any, so this is positions three and four.',
      },
      {
        caption: 'Where the NULLs land',
        sql: 'SELECT department_id FROM employees ORDER BY department_id DESC LIMIT 3;',
        note: 'PostgreSQL treats NULL as larger than any value, so DESC puts it first. NULLS LAST overrides that.',
      },
    ],
    pitfalls: [
      {
        title: 'LIMIT without ORDER BY is not reproducible',
        body: '"The first three rows" is only meaningful once you have said what first means. Without ORDER BY the engine may return anything.',
      },
      {
        title: 'A cut-off inside a tie is arbitrary',
        body: 'If rows 4 and 5 tie, LIMIT 4 can pick either. Add a tiebreaker column, or use RANK() if you want all tied rows.',
      },
    ],
    related: ['sql-l1-select', 'sql-l3-windows'],
    dialectNotes: [
      { engine: 'SQL Server', note: 'Uses SELECT TOP n, or OFFSET n ROWS FETCH NEXT m ROWS ONLY. No LIMIT.' },
      { engine: 'Oracle', note: '12c and later support FETCH FIRST n ROWS ONLY. Older versions used ROWNUM, applied before ORDER BY.' },
      { engine: 'MySQL', note: 'LIMIT works as in PostgreSQL, but NULLs sort first ascending.' },
    ],
  },

  {
    topicId: 'sql-l1-aggregates',
    definition:
      'An aggregate collapses many rows into one value. With no GROUP BY it collapses the entire result into a single row.',
    syntax:
      'COUNT(*)              -- rows\nCOUNT(column)         -- non-NULL values\nCOUNT(DISTINCT column)\nSUM(x)  AVG(x)  MIN(x)  MAX(x)',
    examples: [
      {
        caption: 'The whole table in one row',
        sql: 'SELECT COUNT(*) AS headcount, MIN(salary) AS lowest, MAX(salary) AS highest, ROUND(AVG(salary), 2) AS average FROM employees;',
        note: 'Several aggregates in one select list all summarise the same set of rows.',
      },
      {
        caption: 'The three COUNTs differ',
        sql: 'SELECT COUNT(*) AS all_rows, COUNT(department_id) AS non_null, COUNT(DISTINCT department_id) AS distinct_values FROM employees;',
        note: '12, 10 and 3. COUNT(*) counts rows, COUNT(column) skips NULLs, COUNT(DISTINCT) also deduplicates.',
      },
      {
        caption: 'Aggregating nothing',
        sql: 'SELECT COUNT(*) AS n, SUM(salary) AS total, AVG(salary) AS mean FROM employees WHERE salary > 999999;',
        note: 'One row is still returned. COUNT of nothing is 0; every other aggregate of nothing is NULL.',
      },
      {
        caption: 'MIN and MAX work on text too',
        sql: 'SELECT MIN(name) AS first_alphabetically, MAX(name) AS last_alphabetically FROM employees;',
        note: 'They use the type\'s natural ordering, the same one ORDER BY would use.',
      },
      {
        caption: 'An aggregate beside a bare column fails',
        sql: 'SELECT name, MAX(salary) FROM employees;',
        expectError: true,
        note: 'MAX collapses twelve rows to one, but there are twelve names. The engine rejects the query rather than picking arbitrarily.',
      },
    ],
    pitfalls: [
      {
        title: 'AVG skips NULLs in both halves',
        body: 'AVG(x) is SUM(x) / COUNT(x), so NULL rows are excluded from the divisor too. Use AVG(COALESCE(x, 0)) if they should count as zero.',
      },
      {
        title: 'SUM of nothing is NULL, not 0',
        body: 'Wrap it in COALESCE(SUM(x), 0) when a report needs a number in every cell.',
      },
    ],
    related: ['sql-l1-nulls', 'sql-l2-grouping'],
  },

  {
    topicId: 'sql-l1-tables',
    definition:
      'A table is rows and columns. A primary key identifies each row uniquely; a foreign key points at another table\'s key and keeps the reference honest.',
    syntax:
      'CREATE TABLE t (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  other_id INTEGER REFERENCES other(id)\n);\n\nINSERT INTO t (id, name) VALUES (1, \'x\');\nUPDATE t SET name = \'y\' WHERE id = 1;\nDELETE FROM t WHERE id = 1;',
    examples: [
      {
        caption: 'The shape of a table',
        sql: 'SELECT * FROM departments;',
        showTables: ['departments'],
        note: 'id is the primary key: unique and never NULL. location_id is a foreign key into locations.',
      },
      {
        caption: 'A one-to-many relationship',
        sql: 'SELECT department_id, COUNT(*) AS employees FROM employees WHERE department_id IS NOT NULL GROUP BY department_id ORDER BY department_id;',
        note: 'Many employee rows point at one department row. The foreign key always lives on the "many" side.',
      },
      {
        caption: 'The junction table of a many-to-many',
        sql: 'SELECT * FROM employee_projects ORDER BY employee_id, project_id;',
        showTables: ['employee_projects'],
        note: 'Each row is one pairing. It can carry attributes of the relationship itself, such as hours.',
      },
    ],
    pitfalls: [
      {
        title: 'UPDATE and DELETE without WHERE hit every row',
        body: 'Run the condition as a SELECT first, and wrap destructive statements in a transaction you can roll back.',
      },
      {
        title: 'FLOAT is the wrong type for money',
        body: 'Binary floating point cannot represent 0.1 exactly, so totals drift. Use NUMERIC / DECIMAL for exact decimal values.',
      },
    ],
    related: ['sql-l2-joins', 'sql-l3-design'],
  },

  /* ------------------------------------------------------------ level 2 */
  {
    topicId: 'sql-l2-grouping',
    definition:
      'GROUP BY collapses rows sharing a value into one row per group. HAVING then filters those groups, the way WHERE filters rows.',
    syntax:
      'SELECT key, AGGREGATE(x)\nFROM table\nWHERE row_condition       -- before grouping\nGROUP BY key\nHAVING group_condition    -- after grouping\nORDER BY ...;',
    examples: [
      {
        caption: 'One row per group',
        sql: 'SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id ORDER BY department_id NULLS LAST;',
        note: 'Four groups, because all the NULL department rows group together.',
      },
      {
        caption: 'HAVING filters the finished groups',
        sql: 'SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id HAVING COUNT(*) > 3;',
        note: 'Only IT has more than three. The condition could not go in WHERE, because the count does not exist yet.',
      },
      {
        caption: 'WHERE and HAVING ask different questions',
        sql: 'SELECT department_id, COUNT(*) AS high_earners FROM employees WHERE salary > 4000 GROUP BY department_id HAVING COUNT(*) >= 2 ORDER BY department_id NULLS LAST;',
        note: 'WHERE decides which employees are counted; HAVING decides which departments are reported.',
      },
      {
        caption: 'A bare column outside the GROUP BY is rejected',
        sql: 'SELECT department_id, name, COUNT(*) FROM employees GROUP BY department_id;',
        expectError: true,
        note: 'One group becomes one row, and there is no single name for a group of four people.',
      },
    ],
    pitfalls: [
      {
        title: 'An aggregate cannot appear in WHERE',
        body: 'WHERE runs before grouping, so COUNT(*) does not exist yet. That condition belongs in HAVING.',
      },
      {
        title: 'Filter early when you can',
        body: 'A condition that only concerns individual rows belongs in WHERE: fewer rows then reach the grouping step.',
      },
    ],
    related: ['sql-l1-aggregates', 'sql-l2-joins', 'sql-l3-windows'],
  },

  {
    topicId: 'sql-l2-joins',
    definition:
      'A join combines rows from two tables where the ON condition holds. Which unmatched rows survive is what distinguishes the join types.',
    syntax:
      'FROM a INNER JOIN b ON a.k = b.k   -- matches only\nFROM a LEFT  JOIN b ON a.k = b.k   -- all of a\nFROM a RIGHT JOIN b ON a.k = b.k   -- all of b',
    examples: [
      {
        caption: 'The two tables',
        sql: 'SELECT * FROM employees ORDER BY id;',
        showTables: ['employees', 'departments'],
        datasetId: 'joins',
        note: 'Omar has no department. Finance has no employees. Those two facts make every join type give a different answer.',
      },
      {
        caption: 'INNER JOIN — matches only',
        sql: 'SELECT e.name AS employee, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id ORDER BY e.id;',
        datasetId: 'joins',
        note: 'Two rows. Omar has NULL, and Maya points at department 30, which does not exist — both disappear without a trace.',
      },
      {
        caption: 'LEFT JOIN — every employee',
        sql: 'SELECT e.name AS employee, d.name AS department FROM employees e LEFT JOIN departments d ON e.department_id = d.id ORDER BY e.id;',
        datasetId: 'joins',
        note: 'Four rows. The unmatched ones carry NULL in the department column — a NULL the join manufactured, not one stored in the table.',
      },
      {
        caption: 'RIGHT JOIN — every department',
        sql: 'SELECT e.name AS employee, d.name AS department FROM employees e RIGHT JOIN departments d ON e.department_id = d.id ORDER BY d.id;',
        datasetId: 'joins',
        note: 'Three rows. Finance appears with a NULL employee; Omar and Maya are gone. a LEFT JOIN b and b RIGHT JOIN a are the same query.',
      },
      {
        caption: 'Anti-join: rows with no match',
        sql: 'SELECT d.name AS department FROM departments d LEFT JOIN employees e ON e.department_id = d.id WHERE e.id IS NULL;',
        datasetId: 'joins',
        note: 'Keep every department, then keep only the ones where the join produced nothing. Testing a primary key for IS NULL is the tell.',
      },
      {
        caption: 'Counting over a LEFT JOIN',
        sql: 'SELECT d.name AS department, COUNT(*) AS wrong, COUNT(e.id) AS right FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.name ORDER BY d.name;',
        datasetId: 'joins',
        note: 'Finance shows 1 under COUNT(*) and 0 under COUNT(e.id). Always count the joined column over an outer join.',
      },
    ],
    pitfalls: [
      {
        title: 'An unqualified shared column is ambiguous',
        body: 'Once both tables have a name column, every reference must be qualified. Alias both tables and qualify everything, even when it is not required.',
      },
      {
        title: 'A WHERE condition can undo a LEFT JOIN',
        body: "WHERE d.name = 'IT' discards the NULL-filled rows, turning the outer join back into an inner one. Put the condition in ON instead.",
      },
    ],
    related: ['sql-l2-multijoin', 'sql-l3-advjoins'],
  },

  {
    topicId: 'sql-l2-multijoin',
    definition:
      'Joins chain left to right, each consuming the previous result. More tables means more chances for a join to multiply rows you meant to count once.',
    syntax: 'FROM a\nJOIN b ON a.k = b.k\nJOIN c ON b.j = c.j',
    examples: [
      {
        caption: 'Three tables in a chain',
        sql: "SELECT e.name AS employee, d.name AS department, l.city FROM employees e JOIN departments d ON e.department_id = d.id JOIN locations l ON d.location_id = l.id WHERE l.city = 'Berlin' ORDER BY e.name;",
        note: 'The second ON can reference d because the first join already brought it into scope.',
      },
      {
        caption: 'ON versus WHERE, side by side',
        sql: "SELECT (SELECT COUNT(*) FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE d.name = 'IT') AS condition_in_where, (SELECT COUNT(*) FROM employees e LEFT JOIN departments d ON e.department_id = d.id AND d.name = 'IT') AS condition_in_on;",
        datasetId: 'joins',
        note: '1 versus 4. In WHERE the condition filters the joined result and kills the outer join; in ON it only decides what counts as a match.',
      },
      {
        caption: 'A join multiplies rows',
        sql: 'SELECT e.name AS employee, COUNT(*) AS rows_produced FROM employees e JOIN employee_projects ep ON ep.employee_id = e.id GROUP BY e.name ORDER BY rows_produced DESC, employee;',
        note: 'Ali appears twice because he is on two projects. SUM(e.salary) over this result would count his salary twice.',
      },
      {
        caption: 'Every department, counted correctly',
        sql: 'SELECT d.name AS department, COUNT(e.id) AS headcount FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.name ORDER BY d.name;',
        note: 'Finance shows 0 because COUNT(e.id) skips the NULL the LEFT JOIN produced.',
      },
    ],
    pitfalls: [
      {
        title: 'Join inflation',
        body: 'Each one-to-many join repeats the parent row. An aggregate over the result then counts it several times. Pre-aggregate in a subquery, or use COUNT(DISTINCT).',
      },
      {
        title: 'An inner join later in the chain undoes an earlier outer join',
        body: 'The NULLs an outer join produced cannot match an inner join downstream, so those rows vanish anyway.',
      },
    ],
    related: ['sql-l2-joins', 'sql-l3-advjoins', 'sql-l3-perf'],
  },

  {
    topicId: 'sql-l2-subqueries',
    definition:
      'A subquery is a query inside another. It can supply a single value, a list to test against, or a whole table to read from.',
    syntax:
      'WHERE x = (SELECT ...)        -- scalar: one row, one column\nWHERE x IN (SELECT ...)       -- list\nWHERE EXISTS (SELECT ...)     -- existence\nFROM (SELECT ...) AS t        -- derived table',
    examples: [
      {
        caption: 'Scalar subquery',
        sql: 'SELECT name, salary FROM employees WHERE salary = (SELECT MAX(salary) FROM employees);',
        note: 'MAX collapses to one value, so = works. Unlike ORDER BY ... LIMIT 1, this returns everyone tied at the top.',
      },
      {
        caption: 'Second-highest distinct value',
        sql: 'SELECT MAX(salary) AS second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);',
        note: 'Exclude the top value, then take the maximum of what remains. Robust to ties, unlike LIMIT 1 OFFSET 1.',
      },
      {
        caption: 'EXISTS is correlated',
        sql: 'SELECT d.name FROM departments d WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id) ORDER BY d.name;',
        note: 'The inner query references d.id, so it runs per department. SELECT 1 signals that the columns are irrelevant.',
      },
      {
        caption: 'NOT IN defeated by a NULL',
        sql: 'SELECT name FROM departments WHERE id NOT IN (SELECT department_id FROM employees);',
        note: 'No rows — the subquery contains a NULL. The NOT EXISTS version correctly returns Finance.',
      },
      {
        caption: 'NOT EXISTS gets it right',
        sql: 'SELECT d.name FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id);',
        note: 'Finance. An existence test is a plain true or false, so NULLs cannot poison it.',
      },
      {
        caption: 'Derived table',
        sql: 'SELECT dept, headcount FROM (SELECT department_id AS dept, COUNT(*) AS headcount FROM employees GROUP BY department_id) t WHERE headcount >= 3 ORDER BY dept;',
        note: 'Once the aggregate is computed inside, the outer query can filter it with WHERE. The alias on the derived table is mandatory.',
      },
    ],
    pitfalls: [
      {
        title: 'A scalar subquery must return at most one row',
        body: 'More than one and the query fails at run time. Use IN, EXISTS or = ANY when several rows are possible.',
      },
      {
        title: 'NOT IN plus NULL equals nothing',
        body: 'Prefer NOT EXISTS for anti-joins. It is immune, and it usually reads better once the subquery is correlated anyway.',
      },
    ],
    related: ['sql-l2-setops', 'sql-l3-cte', 'sql-l3-corr'],
  },

  {
    topicId: 'sql-l2-nullcase',
    definition:
      'COALESCE substitutes a value for NULL. CASE branches inside a query — including inside an aggregate, which is how you count conditionally.',
    syntax:
      "COALESCE(x, fallback)\nNULLIF(a, b)            -- NULL when a = b\nCASE WHEN cond THEN v [WHEN ...] [ELSE v] END",
    examples: [
      {
        caption: 'COALESCE takes the first non-NULL',
        sql: "SELECT COALESCE(NULL, NULL, 'third', 'fourth') AS result;",
        note: 'Evaluated left to right, stopping at the first value that is not NULL.',
      },
      {
        caption: 'A readable default',
        sql: "SELECT name AS employee, COALESCE(CAST(department_id AS TEXT), 'unassigned') AS department FROM employees ORDER BY name LIMIT 5;",
        note: 'The CAST is needed because every COALESCE argument must share a type.',
      },
      {
        caption: 'NULLIF guards a division',
        sql: 'SELECT COALESCE(10 / NULLIF(0, 0), -1) AS safe_result;',
        note: 'NULLIF turns the zero divisor into NULL, so the division yields NULL instead of an error — and COALESCE then supplies a default.',
      },
      {
        caption: 'CASE takes the first matching branch',
        sql: "SELECT name AS employee, CASE WHEN salary >= 5000 THEN 'high' WHEN salary >= 3500 THEN 'mid' ELSE 'low' END AS band FROM employees ORDER BY salary DESC;",
        note: 'Order the branches narrowest first. With the thresholds swapped, every high earner would match the mid branch.',
      },
      {
        caption: 'Conditional aggregation',
        sql: 'SELECT department_id, COUNT(CASE WHEN salary > 4000 THEN 1 END) AS high_earners, COUNT(*) AS total FROM employees GROUP BY department_id ORDER BY department_id NULLS LAST;',
        note: 'No ELSE, deliberately: non-matching rows yield NULL and COUNT skips them. With ELSE 0 every row would be counted.',
      },
    ],
    pitfalls: [
      {
        title: 'COUNT(CASE ... ELSE 0 END) counts everything',
        body: 'Zero is a value. Either omit the ELSE so COUNT skips the row, or use SUM(CASE WHEN ... THEN 1 ELSE 0 END).',
      },
      {
        title: 'An ELSE-less CASE that matches nothing returns NULL',
        body: 'Usually what you want inside an aggregate, and usually not what you want in an ordinary select list.',
      },
    ],
    related: ['sql-l1-nulls', 'sql-l3-corr'],
  },

  {
    topicId: 'sql-l2-setops',
    definition:
      'Set operations stack two results vertically. UNION deduplicates, UNION ALL does not, EXCEPT subtracts and INTERSECT keeps the overlap.',
    syntax:
      'SELECT ... UNION [ALL] SELECT ...\nSELECT ... EXCEPT SELECT ...\nSELECT ... INTERSECT SELECT ...\n-- same column count and compatible types on both sides',
    examples: [
      {
        caption: 'Products never sold, via EXCEPT',
        sql: 'SELECT id FROM products EXCEPT SELECT product_id FROM order_items ORDER BY id;',
        note: 'Rows in the first result that are absent from the second. Unlike NOT IN, set operations treat NULL as equal to NULL.',
      },
      {
        caption: 'The same thing as an anti-join',
        sql: 'SELECT p.name FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id WHERE oi.id IS NULL ORDER BY p.name;',
        note: 'Three idioms reach the same answer: LEFT JOIN ... IS NULL, NOT EXISTS, and EXCEPT. NOT IN is the one that is unsafe.',
      },
      {
        caption: 'Customers who have never ordered',
        sql: 'SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) ORDER BY c.name;',
        note: 'Granite and Harbour. NOT EXISTS is the safest of the three anti-join spellings.',
      },
      {
        caption: 'Finding duplicates',
        sql: 'SELECT city, COUNT(*) AS customers FROM customers GROUP BY city HAVING COUNT(*) > 1 ORDER BY city;',
        note: 'Group by the value that repeats, then keep the groups larger than one. This is also the query you run before adding a UNIQUE constraint.',
      },
    ],
    pitfalls: [
      {
        title: 'ORDER BY belongs to the whole expression',
        body: 'There is one result, so there is one ORDER BY, and it goes at the very end. It can only name columns from the first arm.',
      },
      {
        title: 'UNION is not free',
        body: 'Deduplicating costs a sort or a hash. Use UNION ALL when you know there are no duplicates, or do not care.',
      },
    ],
    related: ['sql-l2-subqueries', 'sql-l3-corr'],
    dialectNotes: [
      { engine: 'Oracle', note: 'Spells EXCEPT as MINUS.' },
      { engine: 'MySQL', note: 'EXCEPT and INTERSECT arrived in 8.0.31. Before that, LEFT JOIN ... IS NULL was the workaround.' },
    ],
  },

  {
    topicId: 'sql-l2-datestring',
    definition:
      'Dates compare and sort like any ordered type. The portable way to filter a period is a half-open range; the portable way to reshape text is the standard string functions.',
    syntax:
      "WHERE d >= 'start' AND d < 'next_start'   -- half-open range\nEXTRACT('year', d)   UPPER(s)   LENGTH(s)   SUBSTRING(s, from, len)",
    examples: [
      {
        caption: 'A half-open range',
        sql: "SELECT id, order_date FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' ORDER BY order_date;",
        note: 'Correct whether the column is a date or a timestamp, and it leaves the column bare so an index can be used.',
      },
      {
        caption: 'Grouping by an extracted part',
        sql: "SELECT EXTRACT('year', order_date) AS year, COUNT(*) AS orders FROM orders GROUP BY year ORDER BY year;",
        note: 'Grouping by a derived value works like grouping by a column. PostgreSQL even lets GROUP BY name the select-list alias.',
      },
      {
        caption: 'String functions',
        sql: 'SELECT name, UPPER(name) AS upper, LENGTH(name) AS len, SUBSTRING(name, 1, 4) AS first_four FROM customers ORDER BY id LIMIT 4;',
        note: 'SUBSTRING is 1-based and its third argument is a length, not an end position.',
      },
      {
        caption: 'Concatenation propagates NULL',
        sql: "SELECT name || ' / ' || city AS label FROM customers ORDER BY id LIMIT 3;",
        note: 'Any NULL operand makes the whole expression NULL. CONCAT() treats NULL as an empty string instead.',
      },
    ],
    pitfalls: [
      {
        title: 'BETWEEN on a timestamp loses the last day',
        body: "BETWEEN '2023-01-01' AND '2023-12-31' stops at midnight on the 31st. The half-open range does not have this problem.",
      },
      {
        title: 'A function on the column defeats its index',
        body: "WHERE EXTRACT('year', d) = 2023 forces a full scan. Compare the column directly, or build an expression index.",
      },
    ],
    related: ['sql-l1-patterns', 'sql-l3-perf'],
    dialectNotes: [
      { engine: 'MySQL', note: 'YEAR(d), MONTH(d); CONCAT() rather than ||, whose meaning there is OR.' },
      { engine: 'SQL Server', note: 'DATEPART(year, d); + concatenates strings rather than ||.' },
    ],
  },

  /* ------------------------------------------------------------ level 3 */
  {
    topicId: 'sql-l3-advjoins',
    definition:
      'A self join treats one table as two. CROSS JOIN produces every combination. FULL OUTER JOIN keeps unmatched rows from both sides.',
    syntax:
      'FROM t a JOIN t b ON a.k = b.other_k      -- self\nFROM a CROSS JOIN b                       -- every pair\nFROM a FULL OUTER JOIN b ON a.k = b.k     -- both sides preserved',
    examples: [
      {
        caption: 'Self join: employees and their managers',
        sql: 'SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id ORDER BY e.name;',
        note: 'Two aliases for one table. The join is outer so the two employees at the top of the tree survive with a NULL manager.',
      },
      {
        caption: 'Self join for pairs',
        sql: 'SELECT e1.name AS first, e2.name AS second FROM employees e1 JOIN employees e2 ON e1.department_id = e2.department_id AND e1.id < e2.id WHERE e1.department_id IS NOT NULL ORDER BY first, second;',
        note: 'The < comparison stops a row pairing with itself and lists each pair once rather than twice.',
      },
      {
        caption: 'CROSS JOIN is a product',
        sql: 'SELECT COUNT(*) AS combinations FROM employees CROSS JOIN departments;',
        note: '12 × 4 = 48. Useful for generating grids; usually a bug when it happens by accident.',
      },
      {
        caption: 'FULL OUTER JOIN keeps everything',
        sql: 'SELECT e.name AS employee, d.name AS department FROM employees e FULL OUTER JOIN departments d ON e.department_id = d.id ORDER BY e.id NULLS LAST, d.id;',
        datasetId: 'joins',
        note: 'Five rows: two matched pairs, two unmatched employees, one unmatched department.',
      },
    ],
    pitfalls: [
      {
        title: 'A comma between tables is a CROSS JOIN',
        body: 'FROM a, b WHERE ... with no linking condition quietly multiplies the rows. Explicit JOIN ... ON turns that into a syntax error instead.',
      },
      {
        title: 'MySQL has no FULL OUTER JOIN',
        body: 'Emulate it as a LEFT JOIN UNION a RIGHT JOIN. UNION, not UNION ALL, or the matched rows appear twice.',
      },
    ],
    related: ['sql-l2-joins', 'sql-l3-cte'],
    dialectNotes: [
      { engine: 'MySQL', note: 'No FULL OUTER JOIN; emulate with UNION.' },
      { engine: 'SQLite', note: 'FULL OUTER and RIGHT JOIN arrived in 3.39.' },
    ],
  },

  {
    topicId: 'sql-l3-cte',
    definition:
      'A common table expression names a subquery so the rest of the statement can read it. RECURSIVE lets it refer to itself, which is how hierarchies and series are built.',
    syntax:
      'WITH name AS (SELECT ...), other AS (SELECT ... FROM name)\nSELECT ... FROM other;\n\nWITH RECURSIVE t(col) AS (\n  anchor_query\n  UNION ALL\n  recursive_query_referencing_t\n) SELECT ... FROM t;',
    examples: [
      {
        caption: 'A named step',
        sql: 'WITH counts AS (SELECT department_id AS did, COUNT(*) AS n FROM employees GROUP BY department_id) SELECT d.name AS department, c.n AS headcount FROM departments d JOIN counts c ON c.did = d.id ORDER BY department;',
        note: 'The aggregate is computed once, named, then joined. The same thing as a derived table, read top to bottom.',
      },
      {
        caption: 'CTEs can chain',
        sql: 'WITH counts AS (SELECT department_id AS did, COUNT(*) AS n FROM employees GROUP BY department_id), big AS (SELECT * FROM counts WHERE n >= 3) SELECT * FROM big ORDER BY did;',
        note: 'A later CTE may reference any earlier one, which is what turns a nest of subqueries into a readable pipeline.',
      },
      {
        caption: 'Recursive: generate a series',
        sql: 'WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < 10) SELECT n FROM nums ORDER BY n;',
        note: 'The anchor runs once; the recursive arm runs against the previous round\'s rows until it produces none.',
      },
      {
        caption: 'Recursive: walk a hierarchy',
        sql: 'WITH RECURSIVE chain(id, name, depth) AS (SELECT id, name, 1 FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.id, e.name, c.depth + 1 FROM employees e JOIN chain c ON e.manager_id = c.id) SELECT name AS employee, depth FROM chain ORDER BY depth, employee;',
        note: 'Depth 1 is the roots, depth 2 their reports, and so on. The depth column doubles as a safety valve.',
      },
    ],
    pitfalls: [
      {
        title: 'A recursive CTE needs a stopping condition',
        body: 'Without one the recursion never produces an empty round. Add a WHERE, or cap a depth counter.',
      },
      {
        title: 'CTEs are not always free',
        body: 'Before PostgreSQL 12 a CTE was always materialised — an optimisation fence. Since 12 it is inlined unless you write MATERIALIZED.',
      },
    ],
    related: ['sql-l2-subqueries', 'sql-l3-advjoins', 'sql-l3-windows'],
  },

  {
    topicId: 'sql-l3-windows',
    definition:
      'A window function computes across a set of rows related to the current row — and, unlike GROUP BY, keeps every row in the result.',
    syntax:
      'function() OVER (\n  [PARTITION BY ...]\n  [ORDER BY ...]\n  [ROWS | RANGE frame]\n)',
    examples: [
      {
        caption: 'The three ranking functions on a tie',
        sql: 'SELECT name, salary, ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num, RANK() OVER (ORDER BY salary DESC) AS rank, DENSE_RANK() OVER (ORDER BY salary DESC) AS dense FROM employees ORDER BY salary DESC, name;',
        note: 'Ali and Youssef both earn 4800. ROW_NUMBER gives them 4 and 5; RANK gives both 4 and skips to 6; DENSE_RANK gives both 4 and continues at 5.',
      },
      {
        caption: 'PARTITION BY restarts the numbering',
        sql: 'SELECT department_id, name, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS in_dept FROM employees WHERE department_id IS NOT NULL ORDER BY department_id, in_dept;',
        note: 'The window equivalent of GROUP BY — except every row survives.',
      },
      {
        caption: 'Top-N per group',
        sql: 'SELECT department_id, employee FROM (SELECT department_id, name AS employee, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name) AS rn FROM employees WHERE department_id IS NOT NULL) t WHERE rn = 1 ORDER BY department_id;',
        note: 'The subquery is required: a window function cannot be filtered in WHERE, because WHERE runs first.',
      },
      {
        caption: 'Aggregate without collapsing',
        sql: 'SELECT name, salary, SUM(salary) OVER (PARTITION BY department_id) AS dept_total, ROUND(100.0 * salary / SUM(salary) OVER (), 1) AS pct_of_payroll FROM employees WHERE department_id = 20 ORDER BY name;',
        note: 'An empty OVER () spans the whole result; PARTITION BY narrows it to the department.',
      },
      {
        caption: 'A window function in WHERE is rejected',
        sql: 'SELECT name FROM employees WHERE ROW_NUMBER() OVER (ORDER BY salary) = 1;',
        expectError: true,
        note: 'Windows are evaluated after WHERE. Compute in a subquery or CTE, then filter.',
      },
    ],
    pitfalls: [
      {
        title: 'ROW_NUMBER breaks ties arbitrarily',
        body: 'If two rows tie and you keep rn = 1, which one you get is unspecified. Add a tiebreaker to the window ORDER BY, or use RANK to keep both.',
      },
      {
        title: 'Windows run after GROUP BY',
        body: 'That is why SUM(COUNT(*)) OVER () is legal: the COUNT is already a per-group value by the time the window sees it.',
      },
    ],
    related: ['sql-l2-grouping', 'sql-l3-analytics'],
  },

  {
    topicId: 'sql-l3-analytics',
    definition:
      'The window frame decides which rows the function sees. Changing it turns a total into a running total, or a moving average, or a comparison with the neighbouring row.',
    syntax:
      'SUM(x) OVER (ORDER BY d)                                  -- running total\nAVG(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)\nLAG(x [, offset [, default]]) OVER (ORDER BY d)\nLEAD(x) OVER (ORDER BY d)',
    examples: [
      {
        caption: 'Running total',
        sql: 'SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_total, SUM(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY o.order_date, o.id) AS running FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.customer_id = 1 GROUP BY o.id, o.order_date ORDER BY o.order_date;',
        note: 'Adding ORDER BY to OVER changes the default frame to "everything up to the current row", which is what accumulates the total.',
      },
      {
        caption: 'Compare with the previous row',
        sql: 'SELECT order_date, LAG(order_date) OVER (ORDER BY order_date) AS previous, LEAD(order_date) OVER (ORDER BY order_date) AS next FROM orders WHERE customer_id = 1 ORDER BY order_date;',
        note: 'The first row has no predecessor and the last has no successor, so both ends are NULL. A third argument supplies a default.',
      },
      {
        caption: 'Moving average over an explicit frame',
        sql: 'SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_total, ROUND(AVG(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY o.order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.customer_id = 1 GROUP BY o.id, o.order_date ORDER BY o.order_date;',
        note: 'ROWS is positional. At the start the frame simply has fewer rows in it; there is no error and no NULL.',
      },
      {
        caption: 'Latest row per group',
        sql: 'SELECT customer_id, order_id, order_date FROM (SELECT customer_id, id AS order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn FROM orders) t WHERE rn = 1 ORDER BY customer_id;',
        note: 'MAX(order_date) would give the date but lose the rest of the row. Numbering carries the whole row through.',
      },
    ],
    pitfalls: [
      {
        title: 'RANGE is the default, not ROWS',
        body: 'With ORDER BY on a non-unique column, tied rows all share the same running total under RANGE. Write ROWS when you want strictly positional behaviour.',
      },
      {
        title: 'A running total needs a deterministic order',
        body: 'If two rows share the ORDER BY key, add a tiebreaker — otherwise the intermediate values are not reproducible.',
      },
    ],
    related: ['sql-l3-windows', 'sql-l3-corr'],
  },

  {
    topicId: 'sql-l3-corr',
    definition:
      'A correlated subquery references the outer row, so it is evaluated per row. Conditional aggregation turns rows into columns without any special pivot syntax.',
    syntax:
      'WHERE EXISTS (SELECT 1 FROM t WHERE t.k = outer.k)\nWHERE x > (SELECT AVG(y) FROM t WHERE t.k = outer.k)\nCOUNT(CASE WHEN cond THEN 1 END)',
    examples: [
      {
        caption: 'Above your own group average',
        sql: 'SELECT e.name AS employee, e.salary, e.department_id FROM employees e WHERE e.department_id IS NOT NULL AND e.salary > (SELECT AVG(s.salary) FROM employees s WHERE s.department_id = e.department_id) ORDER BY employee;',
        datasetId: 'company',
        note: 'The inner query recomputes the average for each row\'s own department. A window function expresses the same thing.',
      },
      {
        caption: 'EXISTS avoids duplicate rows',
        sql: "SELECT c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'shipped') ORDER BY c.name;",
        note: 'Each customer appears once however many shipped orders they have. A join would need DISTINCT.',
      },
      {
        caption: 'NOT EXISTS covers two cases at once',
        sql: "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'shipped') ORDER BY c.name;",
        note: 'Customers with no orders and customers whose orders are all cancelled both qualify, with no special handling.',
      },
      {
        caption: 'Pivot with conditional aggregation',
        sql: "SELECT customer_id, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders GROUP BY customer_id ORDER BY customer_id;",
        note: 'One aggregate per output column, each counting only its own rows. Portable to every engine, unlike a PIVOT clause.',
      },
    ],
    pitfalls: [
      {
        title: 'Unqualified columns resolve to the inner table first',
        body: 'WHERE department_id = department_id compares a column with itself and is always true. Alias both tables and qualify every column.',
      },
      {
        title: 'A correlated subquery runs per row',
        body: 'Planners usually rewrite it into a join, but not always. If a report is slow, a window function or a pre-aggregated CTE is often faster.',
      },
    ],
    related: ['sql-l2-subqueries', 'sql-l3-windows', 'sql-l3-perf'],
  },

  {
    topicId: 'sql-l3-design',
    definition:
      'Normalisation removes redundancy so a fact is stored once. Constraints then make the database refuse data that contradicts the model.',
    syntax:
      '1NF  one atomic value per column\n2NF  1NF + no non-key column depends on part of a composite key\n3NF  2NF + no non-key column depends on another non-key column',
    examples: [
      {
        caption: 'A normalised join',
        sql: "SELECT e.name AS employee, COALESCE(d.name, 'none') AS department FROM employees e LEFT JOIN departments d ON d.id = e.department_id ORDER BY employee;",
        note: 'The department name lives in one place. Storing it on employees too would be a 3NF violation, and renaming a department would mean updating every employee row.',
      },
      {
        caption: 'Checking referential integrity by hand',
        sql: 'SELECT e.id, e.department_id FROM employees e WHERE e.department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id);',
        note: 'Empty, so every reference resolves. This is the query to run before adding a foreign key to existing data.',
      },
      {
        caption: 'Finding what would block a UNIQUE constraint',
        sql: 'SELECT email, COUNT(*) AS uses, MIN(name) AS first_user FROM employees GROUP BY email HAVING COUNT(*) > 1 ORDER BY email;',
        note: 'Two employees share an address. Adding UNIQUE(email) would fail until that is resolved.',
      },
      {
        caption: 'Many-to-many done properly',
        sql: 'SELECT e.name AS employee, p.name AS project, ep.hours FROM employee_projects ep JOIN employees e ON e.id = ep.employee_id JOIN projects p ON p.id = ep.project_id ORDER BY employee, project;',
        note: 'A junction table supports any number of pairings and can carry attributes of the relationship, such as hours.',
      },
    ],
    pitfalls: [
      {
        title: 'Repeating columns are a 1NF violation in disguise',
        body: 'project1, project2, project3 caps the relationship arbitrarily and makes "who is on project X" a three-column search. Use a junction table.',
      },
      {
        title: 'Denormalise deliberately, not accidentally',
        body: 'Duplicating a value for speed is a legitimate choice — but then you own keeping the copies in step, usually with a trigger or a scheduled job.',
      },
    ],
    related: ['sql-l1-tables', 'sql-l3-perf'],
  },

  {
    topicId: 'sql-l3-perf',
    definition:
      'An index trades write cost and storage for read speed. A transaction groups statements so they succeed or fail together. EXPLAIN is how you find out what is actually happening.',
    syntax:
      'CREATE INDEX idx ON t (col_a, col_b);\nEXPLAIN ANALYZE SELECT ...;\n\nBEGIN;\n  ...\nCOMMIT;   -- or ROLLBACK;',
    examples: [
      {
        caption: 'A sargable filter',
        sql: "SELECT id, order_date FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' ORDER BY order_date;",
        note: 'The column is compared directly, so an index on order_date could satisfy this with a range scan.',
      },
      {
        caption: 'The same rows, the wrong way',
        sql: "SELECT id, order_date FROM orders WHERE EXTRACT('year', order_date) = 2024 ORDER BY order_date;",
        note: 'Identical result, but the function hides the column from any index. Only EXPLAIN would show the difference — which is why habits matter more than output here.',
      },
      {
        caption: 'Pre-aggregate before joining',
        sql: 'SELECT o.customer_id, SUM(t.order_total) AS total_spend FROM orders o JOIN (SELECT order_id, SUM(quantity * unit_price) AS order_total FROM order_items GROUP BY order_id) t ON t.order_id = o.id GROUP BY o.customer_id ORDER BY total_spend DESC;',
        note: 'Totalling the line items first makes the join one-to-one, which removes any chance of a later join inflating the sums.',
      },
    ],
    pitfalls: [
      {
        title: 'Column order in a composite index matters',
        body: 'Equality predicates first, then the range or sort column. An index on (customer_id, order_date) serves WHERE customer_id = 5 ORDER BY order_date; the reverse does not.',
      },
      {
        title: 'Measure before you change anything',
        body: 'EXPLAIN ANALYZE shows estimated against actual rows per step. A large gap means stale statistics; the slowest step is where the work is.',
      },
      {
        title: 'Isolation levels trade concurrency for correctness',
        body: 'READ COMMITTED allows non-repeatable and phantom reads. REPEATABLE READ stops the first. SERIALIZABLE stops both, at the cost of retries.',
      },
    ],
    related: ['sql-l3-design', 'sql-l2-datestring'],
    dialectNotes: [
      { engine: 'MySQL', note: 'EXPLAIN ANALYZE arrived in 8.0.18. Default isolation level is REPEATABLE READ, not READ COMMITTED.' },
      { engine: 'SQL Server', note: 'Uses SET SHOWPLAN_ALL or the graphical plan. Default isolation is READ COMMITTED.' },
    ],
  },
];

const BY_TOPIC = new Map(SQL_LESSONS.map((l) => [l.topicId, l]));

export function getLesson(topicId: string): Lesson | undefined {
  return BY_TOPIC.get(topicId);
}
