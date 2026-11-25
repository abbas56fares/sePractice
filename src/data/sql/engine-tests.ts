/**
 * Engine conformance suite.
 *
 * Every assertion here was written against PostgreSQL's documented behaviour
 * and checked by hand against the dataset rows. The whole SQL module's
 * correctness rests on this engine, so it is tested directly rather than only
 * through the question bank.
 *
 * Run with `npm run verify:sql`.
 */

import type { SqlValue } from '../../lib/sql';
import { companyDataset, joinsDataset, salesDataset } from './datasets';
import type { SqlDataset } from '../../lib/sql';

export interface EngineTest {
  name: string;
  dataset: SqlDataset;
  sql: string;
  /** Expected rows in order. `null` entries are SQL NULL. */
  expect?: SqlValue[][];
  /** Expected column labels, when the test is about naming. */
  expectColumns?: string[];
  /** The query must fail, and the message must contain this text. */
  expectError?: string;
  /** Row order is not part of the assertion. */
  unordered?: boolean;
  /** Needs write permission. */
  write?: boolean;
}

export const ENGINE_TESTS: EngineTest[] = [
  /* ------------------------------------------------------- basics */
  {
    name: 'SELECT literal',
    dataset: joinsDataset,
    sql: 'SELECT 1 AS one, 2 + 3 AS five',
    expect: [[1, 5]],
    expectColumns: ['one', 'five'],
  },
  {
    name: 'SELECT * returns every column in order',
    dataset: joinsDataset,
    sql: 'SELECT * FROM departments ORDER BY id',
    expect: [
      [10, 'IT'],
      [20, 'HR'],
      [40, 'Finance'],
    ],
    expectColumns: ['id', 'name'],
  },
  {
    name: 'WHERE with a numeric comparison',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE salary > 5000 ORDER BY name',
    expect: [['Maya'], ['Nadia'], ['Rania']],
  },
  {
    name: 'WHERE = NULL matches nothing (three-valued logic)',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE department_id = NULL',
    expect: [],
  },
  {
    name: 'IS NULL finds the unassigned employees',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE department_id IS NULL ORDER BY name',
    expect: [['Dina'], ['Omar']],
  },
  {
    name: 'IS NOT NULL counts the rest',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees WHERE department_id IS NOT NULL',
    expect: [[10]],
  },
  {
    name: 'AND / OR / NOT precedence',
    dataset: companyDataset,
    sql: "SELECT name FROM employees WHERE department_id = 10 AND salary > 4000 OR name = 'Dina' ORDER BY name",
    expect: [['Ali'], ['Dina'], ['Rania'], ['Youssef']],
  },
  {
    name: 'BETWEEN is inclusive at both ends',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE salary BETWEEN 3100 AND 3900 ORDER BY salary',
    expect: [['Tarek'], ['Amira'], ['Hassan'], ['Sara']],
  },
  {
    name: 'IN with a list',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees WHERE department_id IN (10, 20)',
    expect: [[7]],
  },
  {
    name: 'NOT IN with a NULL in the list yields no rows',
    dataset: joinsDataset,
    sql: 'SELECT name FROM employees WHERE department_id NOT IN (10, NULL)',
    expect: [],
  },
  {
    name: 'LIKE with a leading wildcard',
    dataset: companyDataset,
    sql: "SELECT name FROM employees WHERE name LIKE 'A%' ORDER BY name",
    expect: [['Ali'], ['Amira']],
  },
  {
    name: 'LIKE underscore matches exactly one character',
    dataset: companyDataset,
    sql: "SELECT name FROM employees WHERE name LIKE '____' ORDER BY name",
    expect: [['Dina'], ['Maya'], ['Omar'], ['Sara']],
  },
  {
    name: 'ILIKE is case-insensitive',
    dataset: companyDataset,
    sql: "SELECT name FROM employees WHERE name ILIKE 'a%' ORDER BY name",
    expect: [['Ali'], ['Amira']],
  },
  {
    name: 'DISTINCT keeps one NULL',
    dataset: companyDataset,
    sql: 'SELECT DISTINCT department_id FROM employees ORDER BY department_id',
    expect: [[10], [20], [30], [null]],
  },
  {
    name: 'ORDER BY DESC puts NULLs first by default',
    dataset: companyDataset,
    sql: 'SELECT department_id FROM employees ORDER BY department_id DESC LIMIT 3',
    expect: [[null], [null], [30]],
  },
  {
    name: 'ORDER BY ... NULLS LAST overrides the default',
    dataset: companyDataset,
    sql: 'SELECT department_id FROM employees ORDER BY department_id DESC NULLS LAST LIMIT 3',
    expect: [[30], [30], [30]],
  },
  {
    name: 'LIMIT with OFFSET',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees ORDER BY salary DESC LIMIT 3 OFFSET 1',
    expect: [['Rania'], ['Maya'], ['Ali']],
  },
  {
    name: 'ORDER BY a select-list alias',
    dataset: companyDataset,
    sql: 'SELECT name, salary * 12 AS annual FROM employees ORDER BY annual DESC LIMIT 2',
    expect: [
      ['Nadia', 73200],
      ['Rania', 67200],
    ],
  },
  {
    name: 'ORDER BY an ordinal position',
    dataset: joinsDataset,
    sql: 'SELECT name, id FROM departments ORDER BY 2 DESC',
    expect: [
      ['Finance', 40],
      ['HR', 20],
      ['IT', 10],
    ],
  },

  /* --------------------------------------------------- aggregates */
  {
    name: 'COUNT(*) counts rows including NULL columns',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees',
    expect: [[12]],
  },
  {
    name: 'COUNT(column) skips NULLs',
    dataset: companyDataset,
    sql: 'SELECT COUNT(department_id) FROM employees',
    expect: [[10]],
  },
  {
    name: 'COUNT(DISTINCT column) skips NULLs too',
    dataset: companyDataset,
    sql: 'SELECT COUNT(DISTINCT department_id) FROM employees',
    expect: [[3]],
  },
  {
    name: 'MIN / MAX / SUM / AVG',
    dataset: companyDataset,
    sql: 'SELECT MIN(salary), MAX(salary), SUM(salary), ROUND(AVG(salary), 2) FROM employees',
    expect: [[2500, 6100, 49600, 4133.33]],
  },
  {
    name: 'An aggregate over no rows returns NULL, but COUNT returns 0',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*), SUM(salary), AVG(salary), MAX(salary) FROM employees WHERE salary > 999999',
    expect: [[0, null, null, null]],
  },
  {
    name: 'GROUP BY with COUNT',
    dataset: companyDataset,
    sql: 'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id ORDER BY department_id NULLS LAST',
    expect: [
      [10, 4],
      [20, 3],
      [30, 3],
      [null, 2],
    ],
  },
  {
    name: 'GROUP BY groups NULLs together',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees WHERE department_id IS NULL GROUP BY department_id',
    expect: [[2]],
  },
  {
    name: 'HAVING filters groups after aggregation',
    dataset: companyDataset,
    sql: 'SELECT department_id, COUNT(*) AS n FROM employees GROUP BY department_id HAVING COUNT(*) > 3 ORDER BY department_id',
    expect: [[10, 4]],
  },
  {
    name: 'WHERE filters rows before grouping',
    dataset: companyDataset,
    sql: 'SELECT department_id, COUNT(*) FROM employees WHERE salary > 3000 GROUP BY department_id ORDER BY department_id NULLS LAST',
    expect: [
      [10, 4],
      [20, 2],
      [30, 3],
      [null, 1],
    ],
  },
  {
    name: 'A bare column outside GROUP BY is rejected',
    dataset: companyDataset,
    sql: 'SELECT name, COUNT(*) FROM employees GROUP BY department_id',
    expectError: 'must appear in the GROUP BY clause',
  },
  {
    name: 'Conditional aggregation with CASE',
    dataset: companyDataset,
    sql: "SELECT COUNT(CASE WHEN salary > 4000 THEN 1 END) AS well_paid, COUNT(*) AS total FROM employees",
    expect: [[6, 12]],
  },

  /* -------------------------------------------------------- joins */
  {
    name: 'INNER JOIN drops unmatched rows on both sides',
    dataset: joinsDataset,
    sql: 'SELECT e.name, d.name FROM employees e INNER JOIN departments d ON e.department_id = d.id ORDER BY e.name',
    expect: [
      ['Ali', 'IT'],
      ['Sara', 'HR'],
    ],
  },
  {
    name: 'LEFT JOIN keeps every left row',
    dataset: joinsDataset,
    sql: 'SELECT e.name, d.name FROM employees e LEFT JOIN departments d ON e.department_id = d.id ORDER BY e.id',
    expect: [
      ['Ali', 'IT'],
      ['Sara', 'HR'],
      ['Omar', null],
      ['Maya', null],
    ],
  },
  {
    name: 'RIGHT JOIN keeps every right row',
    dataset: joinsDataset,
    sql: 'SELECT e.name, d.name FROM employees e RIGHT JOIN departments d ON e.department_id = d.id ORDER BY d.id',
    expect: [
      ['Ali', 'IT'],
      ['Sara', 'HR'],
      [null, 'Finance'],
    ],
  },
  {
    name: 'FULL OUTER JOIN keeps unmatched rows from both sides',
    dataset: joinsDataset,
    sql: 'SELECT e.name, d.name FROM employees e FULL OUTER JOIN departments d ON e.department_id = d.id ORDER BY e.id NULLS LAST, d.id',
    expect: [
      ['Ali', 'IT'],
      ['Sara', 'HR'],
      ['Omar', null],
      ['Maya', null],
      [null, 'Finance'],
    ],
  },
  {
    name: 'CROSS JOIN multiplies the row counts',
    dataset: joinsDataset,
    sql: 'SELECT COUNT(*) FROM employees CROSS JOIN departments',
    expect: [[12]],
  },
  {
    name: 'Comma-separated tables behave as a cross join',
    dataset: joinsDataset,
    sql: 'SELECT COUNT(*) FROM employees, departments',
    expect: [[12]],
  },
  {
    name: 'LEFT JOIN ... IS NULL finds rows with no match',
    dataset: companyDataset,
    sql: 'SELECT d.name FROM departments d LEFT JOIN employees e ON e.department_id = d.id WHERE e.id IS NULL ORDER BY d.name',
    expect: [['Finance']],
  },
  {
    name: 'A condition in WHERE turns a LEFT JOIN into an inner join',
    dataset: joinsDataset,
    sql: "SELECT COUNT(*) FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE d.name = 'IT'",
    expect: [[1]],
  },
  {
    name: 'The same condition in ON keeps the unmatched left rows',
    dataset: joinsDataset,
    sql: "SELECT COUNT(*) FROM employees e LEFT JOIN departments d ON e.department_id = d.id AND d.name = 'IT'",
    expect: [[4]],
  },
  {
    name: 'Self join resolves manager names',
    dataset: companyDataset,
    sql: 'SELECT e.name, m.name AS manager FROM employees e JOIN employees m ON e.manager_id = m.id ORDER BY e.name LIMIT 3',
    expect: [
      ['Amira', 'Ali'],
      ['Hassan', 'Maya'],
      ['Karim', 'Sara'],
    ],
  },
  {
    name: 'Three-table join',
    dataset: companyDataset,
    sql: `SELECT e.name, d.name AS dept, l.city
          FROM employees e
          JOIN departments d ON e.department_id = d.id
          JOIN locations l ON d.location_id = l.id
          WHERE l.city = 'Berlin'
          ORDER BY e.name`,
    expect: [
      ['Karim', 'HR', 'Berlin'],
      ['Sara', 'HR', 'Berlin'],
      ['Tarek', 'HR', 'Berlin'],
    ],
  },
  {
    name: 'JOIN ... USING merges the joined column',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees e JOIN departments d USING (id)',
    // Only employee 10 and department 10 share an id.
    expect: [[1]],
  },
  {
    name: 'Ambiguous unqualified column is rejected',
    dataset: joinsDataset,
    sql: 'SELECT name FROM employees JOIN departments ON employees.department_id = departments.id',
    expectError: 'ambiguous',
  },
  {
    name: 'COUNT over a LEFT JOIN: COUNT(*) vs COUNT(column)',
    dataset: companyDataset,
    sql: `SELECT d.name, COUNT(*) AS star, COUNT(e.id) AS people
          FROM departments d LEFT JOIN employees e ON e.department_id = d.id
          GROUP BY d.name ORDER BY d.name`,
    expect: [
      ['Finance', 1, 0],
      ['HR', 3, 3],
      ['IT', 4, 4],
      ['Sales', 3, 3],
    ],
  },

  /* --------------------------------------------------- subqueries */
  {
    name: 'Scalar subquery in WHERE',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE salary = (SELECT MAX(salary) FROM employees)',
    expect: [['Nadia']],
  },
  {
    name: 'Second-highest distinct salary',
    dataset: companyDataset,
    sql: 'SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)',
    expect: [[5600]],
  },
  {
    name: 'IN with a subquery',
    dataset: companyDataset,
    sql: `SELECT name FROM employees
          WHERE department_id IN (SELECT id FROM departments WHERE location_id = 1)
          ORDER BY name`,
    expect: [['Ali'], ['Amira'], ['Hassan'], ['Maya'], ['Nadia'], ['Rania'], ['Youssef']],
  },
  {
    name: 'EXISTS with a correlated subquery',
    dataset: companyDataset,
    sql: `SELECT d.name FROM departments d
          WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id)
          ORDER BY d.name`,
    expect: [['HR'], ['IT'], ['Sales']],
  },
  {
    name: 'NOT EXISTS finds the empty department',
    dataset: companyDataset,
    sql: `SELECT d.name FROM departments d
          WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id)`,
    expect: [['Finance']],
  },
  {
    name: 'Correlated subquery in the SELECT list',
    dataset: companyDataset,
    sql: `SELECT d.name, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) AS n
          FROM departments d ORDER BY d.name`,
    expect: [
      ['Finance', 0],
      ['HR', 3],
      ['IT', 4],
      ['Sales', 3],
    ],
  },
  {
    name: 'Derived table in FROM',
    dataset: companyDataset,
    sql: `SELECT dept, n FROM (
            SELECT department_id AS dept, COUNT(*) AS n FROM employees GROUP BY department_id
          ) t WHERE n >= 3 ORDER BY dept`,
    expect: [
      [10, 4],
      [20, 3],
      [30, 3],
    ],
  },
  {
    name: 'A scalar subquery returning many rows is an error',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE salary = (SELECT salary FROM employees)',
    expectError: 'only one value',
  },
  {
    name: 'Quantified comparison with ALL',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE salary >= ALL (SELECT salary FROM employees)',
    expect: [['Nadia']],
  },

  /* ------------------------------------------------- set operations */
  {
    name: 'UNION removes duplicates',
    dataset: companyDataset,
    sql: 'SELECT department_id FROM employees UNION SELECT department_id FROM employees ORDER BY department_id NULLS LAST',
    expect: [[10], [20], [30], [null]],
  },
  {
    name: 'UNION ALL keeps them',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM (SELECT id FROM employees UNION ALL SELECT id FROM employees) t',
    expect: [[24]],
  },
  {
    name: 'EXCEPT subtracts',
    dataset: companyDataset,
    sql: 'SELECT id FROM departments EXCEPT SELECT department_id FROM employees ORDER BY id',
    expect: [[40]],
  },
  {
    name: 'INTERSECT keeps the overlap',
    dataset: companyDataset,
    sql: 'SELECT id FROM departments INTERSECT SELECT department_id FROM employees ORDER BY id',
    expect: [[10], [20], [30]],
  },
  {
    name: 'Mismatched column counts in a set operation are rejected',
    dataset: companyDataset,
    sql: 'SELECT id FROM departments UNION SELECT id, name FROM departments',
    expectError: 'same number of columns',
  },

  /* ---------------------------------------------------------- CTEs */
  {
    name: 'A simple CTE',
    dataset: companyDataset,
    sql: `WITH dept_counts AS (
            SELECT department_id, COUNT(*) AS n FROM employees GROUP BY department_id
          )
          SELECT department_id, n FROM dept_counts WHERE n > 3`,
    expect: [[10, 4]],
  },
  {
    name: 'Two CTEs, the second joining the first',
    dataset: companyDataset,
    sql: `WITH counts AS (
            SELECT department_id AS did, COUNT(*) AS n FROM employees GROUP BY department_id
          ), named AS (
            SELECT d.name, c.n FROM departments d JOIN counts c ON c.did = d.id
          )
          SELECT name, n FROM named ORDER BY name`,
    expect: [
      ['HR', 3],
      ['IT', 4],
      ['Sales', 3],
    ],
  },
  {
    name: 'Recursive CTE generates a series',
    dataset: joinsDataset,
    sql: `WITH RECURSIVE counter(n) AS (
            SELECT 1
            UNION ALL
            SELECT n + 1 FROM counter WHERE n < 5
          )
          SELECT n FROM counter ORDER BY n`,
    expect: [[1], [2], [3], [4], [5]],
  },
  {
    name: 'Recursive CTE walks a management chain',
    dataset: companyDataset,
    sql: `WITH RECURSIVE chain(id, name, depth) AS (
            SELECT id, name, 1 FROM employees WHERE manager_id IS NULL AND id = 1
            UNION ALL
            SELECT e.id, e.name, c.depth + 1
            FROM employees e JOIN chain c ON e.manager_id = c.id
          )
          SELECT depth, COUNT(*) FROM chain GROUP BY depth ORDER BY depth`,
    expect: [
      [1, 1],
      [2, 6],
      [3, 4],
    ],
  },

  /* ---------------------------------------------- window functions */
  {
    name: 'ROW_NUMBER over the whole set',
    dataset: companyDataset,
    sql: 'SELECT name, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn FROM employees ORDER BY rn LIMIT 3',
    expect: [
      ['Nadia', 1],
      ['Rania', 2],
      ['Maya', 3],
    ],
  },
  {
    name: 'RANK leaves a gap after a tie, DENSE_RANK does not',
    dataset: companyDataset,
    sql: `SELECT name,
                 RANK() OVER (ORDER BY salary DESC) AS r,
                 DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
          FROM employees ORDER BY salary DESC, name LIMIT 6`,
    expect: [
      ['Nadia', 1, 1],
      ['Rania', 2, 2],
      ['Maya', 3, 3],
      ['Ali', 4, 4],
      ['Youssef', 4, 4],
      ['Dina', 6, 5],
    ],
  },
  {
    name: 'PARTITION BY restarts the numbering',
    dataset: companyDataset,
    sql: `SELECT department_id, name, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn
          FROM employees WHERE department_id = 20 ORDER BY rn`,
    expect: [
      [20, 'Sara', 1],
      [20, 'Karim', 3],
      [20, 'Tarek', 2],
    ],
    unordered: true,
  },
  {
    name: 'Top-N per group with a window function',
    dataset: companyDataset,
    sql: `SELECT department_id, name FROM (
            SELECT department_id, name,
                   ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name) AS rn
            FROM employees WHERE department_id IS NOT NULL
          ) t WHERE rn = 1 ORDER BY department_id`,
    expect: [
      [10, 'Rania'],
      [20, 'Sara'],
      [30, 'Nadia'],
    ],
  },
  {
    name: 'Running total via the default frame',
    dataset: joinsDataset,
    sql: `SELECT id, SUM(id) OVER (ORDER BY id) AS running FROM employees ORDER BY id`,
    expect: [
      [1, 1],
      [2, 3],
      [3, 6],
      [4, 10],
    ],
  },
  {
    name: 'An aggregate window with no ORDER BY spans the partition',
    dataset: companyDataset,
    sql: `SELECT name, salary, SUM(salary) OVER (PARTITION BY department_id) AS dept_total
          FROM employees WHERE department_id = 20 ORDER BY name`,
    expect: [
      ['Karim', 2800, 9800],
      ['Sara', 3900, 9800],
      ['Tarek', 3100, 9800],
    ],
  },
  {
    name: 'LAG and LEAD',
    dataset: joinsDataset,
    sql: `SELECT id, LAG(name) OVER (ORDER BY id) AS prev, LEAD(name) OVER (ORDER BY id) AS next
          FROM employees ORDER BY id`,
    expect: [
      [1, null, 'Sara'],
      [2, 'Ali', 'Omar'],
      [3, 'Sara', 'Maya'],
      [4, 'Omar', null],
    ],
  },
  {
    name: 'LAG with an explicit offset and default',
    dataset: joinsDataset,
    sql: "SELECT id, LAG(name, 2, 'none') OVER (ORDER BY id) AS two_back FROM employees ORDER BY id",
    expect: [
      [1, 'none'],
      [2, 'none'],
      [3, 'Ali'],
      [4, 'Sara'],
    ],
  },
  {
    name: 'Moving average over a ROWS frame',
    dataset: joinsDataset,
    sql: `SELECT id, ROUND(AVG(id) OVER (ORDER BY id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 2) AS moving
          FROM employees ORDER BY id`,
    expect: [
      [1, 1],
      [2, 1.5],
      [3, 2.5],
      [4, 3.5],
    ],
  },
  {
    name: 'A window function over grouped output',
    dataset: companyDataset,
    sql: `SELECT department_id, COUNT(*) AS n, SUM(COUNT(*)) OVER () AS total
          FROM employees WHERE department_id IS NOT NULL
          GROUP BY department_id ORDER BY department_id`,
    expect: [
      [10, 4, 10],
      [20, 3, 10],
      [30, 3, 10],
    ],
  },
  {
    name: 'A window function in WHERE is rejected',
    dataset: companyDataset,
    sql: 'SELECT name FROM employees WHERE ROW_NUMBER() OVER (ORDER BY salary) = 1',
    expectError: 'can only be used in the SELECT list',
  },

  /* ------------------------------------------------- expressions */
  {
    name: 'CASE WHEN buckets values',
    dataset: companyDataset,
    sql: `SELECT CASE WHEN salary >= 5000 THEN 'high' WHEN salary >= 3500 THEN 'mid' ELSE 'low' END AS band,
                 COUNT(*) AS n
          FROM employees GROUP BY band ORDER BY band`,
    expect: [
      ['high', 3],
      ['low', 4],
      ['mid', 5],
    ],
  },
  {
    name: 'COALESCE substitutes for NULL',
    dataset: companyDataset,
    sql: 'SELECT COALESCE(department_id, -1) AS d FROM employees WHERE department_id IS NULL',
    expect: [[-1], [-1]],
  },
  {
    name: 'Concatenating with NULL yields NULL',
    dataset: joinsDataset,
    sql: "SELECT name || '-' || CAST(department_id AS TEXT) AS tag FROM employees WHERE id = 3",
    expect: [[null]],
  },
  {
    name: 'Integer division truncates',
    dataset: joinsDataset,
    sql: 'SELECT 7 / 2 AS int_div, 7.0 / 2 AS real_div',
    expect: [[3, 3.5]],
  },
  {
    name: 'Division by zero is an error',
    dataset: joinsDataset,
    sql: 'SELECT 1 / 0',
    expectError: 'division by zero',
  },
  {
    name: 'NULLIF guards a division',
    dataset: joinsDataset,
    sql: 'SELECT COALESCE(10 / NULLIF(0, 0), -1) AS safe',
    expect: [[-1]],
  },
  {
    name: 'String functions',
    dataset: joinsDataset,
    sql: "SELECT UPPER(name), LENGTH(name), SUBSTRING(name, 1, 2) FROM employees WHERE id = 1",
    expect: [['ALI', 3, 'Al']],
  },
  {
    name: 'ROUND to a given number of places',
    dataset: joinsDataset,
    sql: 'SELECT ROUND(2.345, 2), ROUND(2.5), ROUND(-2.5)',
    expect: [[2.35, 3, -3]],
  },
  {
    name: 'EXTRACT pulls a date part',
    dataset: companyDataset,
    sql: "SELECT EXTRACT('year', hire_date) AS y, COUNT(*) FROM employees GROUP BY y ORDER BY y",
    expect: [
      [2017, 1],
      [2018, 1],
      [2019, 2],
      [2020, 2],
      [2021, 2],
      [2022, 2],
      [2023, 2],
    ],
  },
  {
    name: 'Date filtering with a string comparison',
    dataset: companyDataset,
    sql: "SELECT COUNT(*) FROM employees WHERE hire_date >= '2022-01-01'",
    expect: [[4]],
  },
  {
    name: 'An unknown function is reported, not silently NULL',
    dataset: joinsDataset,
    sql: 'SELECT frobnicate(1)',
    expectError: 'Unknown function',
  },
  {
    name: 'An unknown column names what is available',
    dataset: joinsDataset,
    sql: 'SELECT salary FROM employees',
    expectError: 'does not exist',
  },
  {
    name: 'An unknown table is reported',
    dataset: joinsDataset,
    sql: 'SELECT * FROM nope',
    expectError: 'does not exist',
  },
  {
    name: 'A syntax error names what was expected',
    dataset: joinsDataset,
    sql: 'SELECT FROM',
    expectError: 'Expected',
  },

  /* ----------------------------------------------- realistic sales */
  {
    name: 'Customers with more than three orders',
    dataset: salesDataset,
    sql: `SELECT c.name, COUNT(*) AS orders
          FROM customers c JOIN orders o ON o.customer_id = c.id
          GROUP BY c.name HAVING COUNT(*) > 3 ORDER BY c.name`,
    expect: [['Acme Ltd', 5]],
  },
  {
    name: 'Customers who have never ordered',
    dataset: salesDataset,
    sql: `SELECT c.name FROM customers c
          LEFT JOIN orders o ON o.customer_id = c.id
          WHERE o.id IS NULL ORDER BY c.name`,
    expect: [['Granite'], ['Harbour']],
  },
  {
    name: 'Products never sold',
    dataset: salesDataset,
    sql: `SELECT name FROM products
          WHERE id NOT IN (SELECT product_id FROM order_items)
          ORDER BY name`,
    expect: [['Cable Kit'], ['Webcam']],
  },
  {
    name: 'Revenue per product',
    dataset: salesDataset,
    sql: `SELECT p.name, SUM(oi.quantity * oi.unit_price) AS revenue
          FROM products p JOIN order_items oi ON oi.product_id = p.id
          GROUP BY p.name ORDER BY revenue DESC LIMIT 3`,
    expect: [
      ['Laptop', 5950],
      ['Monitor', 3000],
      ['Standing Desk', 2600],
    ],
  },
  {
    name: 'Each customer latest order',
    dataset: salesDataset,
    sql: `SELECT c.name, MAX(o.order_date) AS latest
          FROM customers c JOIN orders o ON o.customer_id = c.id
          GROUP BY c.name ORDER BY c.name`,
    expect: [
      ['Acme Ltd', '2024-02-28'],
      ['Borealis', '2024-04-02'],
      ['Cedar Co', '2023-11-23'],
      ['Delta Works', '2024-01-12'],
      ['Everest', '2024-05-19'],
      ['Fjord AB', '2024-03-14'],
    ],
  },
  {
    name: 'Duplicate email addresses',
    dataset: companyDataset,
    sql: `SELECT email, COUNT(*) AS n FROM employees
          GROUP BY email HAVING COUNT(*) > 1 ORDER BY email`,
    expect: [['ali@corp.com', 2]],
  },
  {
    name: 'Three-table join with grouping and ordering',
    dataset: salesDataset,
    sql: `SELECT c.country, COUNT(DISTINCT o.id) AS orders, SUM(oi.quantity) AS units
          FROM customers c
          JOIN orders o ON o.customer_id = c.id
          JOIN order_items oi ON oi.order_id = o.id
          GROUP BY c.country
          HAVING SUM(oi.quantity) > 5
          ORDER BY units DESC, c.country`,
    expect: [
      ['UK', 7, 26],
      ['Germany', 4, 15],
      ['Spain', 2, 13],
    ],
  },

  /* ------------------------------------------------------------ DML */
  {
    name: 'INSERT then SELECT sees the new row',
    dataset: joinsDataset,
    write: true,
    sql: `INSERT INTO departments (id, name) VALUES (50, 'Legal');
          SELECT name FROM departments ORDER BY id`,
    expect: [['IT'], ['HR'], ['Finance'], ['Legal']],
  },
  {
    name: 'UPDATE with a WHERE clause',
    dataset: joinsDataset,
    write: true,
    sql: `UPDATE employees SET department_id = 10 WHERE department_id IS NULL;
          SELECT COUNT(*) FROM employees WHERE department_id = 10`,
    expect: [[2]],
  },
  {
    name: 'DELETE with a subquery',
    dataset: joinsDataset,
    write: true,
    sql: `DELETE FROM employees WHERE department_id NOT IN (SELECT id FROM departments);
          SELECT COUNT(*) FROM employees`,
    expect: [[3]],
  },
  {
    name: 'INSERT INTO ... SELECT',
    dataset: joinsDataset,
    write: true,
    sql: `INSERT INTO departments (id, name) SELECT id + 100, name FROM departments;
          SELECT COUNT(*) FROM departments`,
    expect: [[6]],
  },
  {
    name: 'A write is rejected in a read-only exercise',
    dataset: joinsDataset,
    sql: "DELETE FROM employees",
    expectError: 'read-only',
  },
  {
    name: 'A write does not leak into the next run',
    dataset: joinsDataset,
    sql: 'SELECT COUNT(*) FROM employees',
    expect: [[4]],
  },

  /* ------------------------------------------------------- guards */
  {
    name: 'A runaway cross product is stopped',
    dataset: companyDataset,
    sql: 'SELECT COUNT(*) FROM employees a, employees b, employees c, employees d, employees e, employees f, employees g',
    expectError: 'Query stopped',
  },
  {
    name: 'A non-terminating recursive CTE is stopped',
    dataset: joinsDataset,
    sql: `WITH RECURSIVE forever(n) AS (
            SELECT 1 UNION ALL SELECT n + 1 FROM forever
          )
          SELECT COUNT(*) FROM forever`,
    expectError: 'did not terminate',
  },
];
