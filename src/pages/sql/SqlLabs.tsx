import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GitMerge, Info, Layers, ListOrdered } from 'lucide-react';
import { joinsDataset } from '../../data/sql/datasets';
import { runSql } from '../../lib/sql';
import { CodeBlock } from '../../components/CodeBlock';
import { JoinRowDiagram, JoinVennDiagram } from '../../components/sql/JoinDiagram';
import { JOIN_SHAPES, type JoinKind } from '../../lib/join-shapes';
import { DataTable, ResultGrid } from '../../components/sql/SqlResultTable';
import { Button, ButtonLink, Card, Pill, SectionHeading } from '../../components/ui';
import { SqlTagPractice } from './SqlPractice';

/* ----------------------------------------------------------- JOIN lab */

const JOIN_QUERIES: Record<JoinKind, string> = {
  inner: `SELECT e.name AS employee, d.name AS department
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
ORDER BY e.id;`,
  left: `SELECT e.name AS employee, d.name AS department
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
ORDER BY e.id;`,
  right: `SELECT e.name AS employee, d.name AS department
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.id
ORDER BY d.id;`,
  full: `SELECT e.name AS employee, d.name AS department
FROM employees e
FULL OUTER JOIN departments d ON e.department_id = d.id
ORDER BY e.id NULLS LAST, d.id;`,
  cross: `SELECT e.name AS employee, d.name AS department
FROM employees e
CROSS JOIN departments d
ORDER BY e.id, d.id;`,
};

const JOIN_NOTES: Record<JoinKind, string> = {
  inner:
    'Two rows. Omar has no department_id and Maya points at department 30, which does not exist — both vanish without any warning. That silent loss is the main hazard of INNER JOIN.',
  left:
    'Four rows: every employee survives. Omar and Maya come back with NULL in the department column — a NULL the join manufactured, not one stored in the table.',
  right:
    'Three rows: every department survives, so Finance appears with a NULL employee. Omar and Maya are gone. `a LEFT JOIN b` and `b RIGHT JOIN a` are the same query.',
  full:
    'Five rows: the two matched pairs, the two unmatched employees, and the unmatched department. A FULL OUTER JOIN is a LEFT and a RIGHT join combined, with matched pairs listed once.',
  cross:
    'Twelve rows — four employees times three departments. No ON condition, so every combination appears. Useful for generating grids; usually a bug when it happens by accident.',
};

const ALL_KINDS: JoinKind[] = ['inner', 'left', 'right', 'full', 'cross'];

const KIND_NAME: Record<JoinKind, string> = {
  inner: 'INNER JOIN',
  left: 'LEFT JOIN',
  right: 'RIGHT JOIN',
  full: 'FULL OUTER JOIN',
  cross: 'CROSS JOIN',
};

function JoinExplorer() {
  const [kind, setKind] = useState<JoinKind>('inner');
  const sql = JOIN_QUERIES[kind];
  const outcome = useMemo(() => runSql(joinsDataset, sql), [sql]);

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Join type">
        {ALL_KINDS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? 'primary' : 'secondary'}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
          >
            {KIND_NAME[k]}
          </Button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        <div className="flex shrink-0 justify-center lg:block">
          <JoinVennDiagram kind={kind} size={160} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-fg">{KIND_NAME[kind]}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{JOIN_NOTES[kind]}</p>
        </div>
      </div>

      <CodeBlock code={sql} lang="sql" showLineNumbers={false} />

      {outcome.ok && outcome.result ? (
        <ResultGrid result={outcome.result} caption={KIND_NAME[kind] + ' result'} maxHeight={380} />
      ) : (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-3.5 py-3 text-sm text-fg-soft">
          {outcome.error}
        </div>
      )}
    </Card>
  );
}

export function SqlJoinLab() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">JOIN lab</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Four employees and three departments, chosen so every join type gives a visibly different
          answer: Omar has no department, Maya points at one that does not exist, and Finance has
          nobody in it. Every result below is produced by actually running the query.
        </p>
      </div>

      <section>
        <SectionHeading
          title="The two tables"
          description="Small enough to check any claim on this page by eye."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {joinsDataset.tables.map((table) => (
            <DataTable key={table.name} table={table} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Compare the join types"
          icon={<GitMerge size={18} />}
          description="Switch between them and watch which rows survive."
        />
        <JoinExplorer />
      </section>

      <section>
        <SectionHeading
          title="Side by side"
          description="Which rows each join keeps, and where the NULLs come from."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {JOIN_SHAPES.map((shape) => (
            <Card key={shape.kind} className="p-5">
              <div className="flex items-start gap-4">
                <JoinVennDiagram kind={shape.kind} size={110} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg">{shape.name}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{shape.summary}</p>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
                <JoinRowDiagram kind={shape.kind} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="The two things that catch people out"
          icon={<Info size={18} />}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">ON versus WHERE in an outer join</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              A condition in WHERE runs <em>after</em> the join and rejects the NULL-filled rows,
              quietly turning a LEFT JOIN back into an inner one. The same condition in ON only
              decides which rows pair up, so unmatched left rows are still preserved.
            </p>
            <CodeBlock
              code={`-- 1 row: the WHERE kills the outer join
SELECT COUNT(*) FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE d.name = 'IT';

-- 4 rows: the condition only affects matching
SELECT COUNT(*) FROM employees e
LEFT JOIN departments d ON e.department_id = d.id AND d.name = 'IT';`}
              lang="sql"
              showLineNumbers={false}
            />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-fg">COUNT(*) versus COUNT(column)</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              A LEFT JOIN gives an unmatched row one NULL-filled result row. COUNT(*) counts it;
              COUNT of the joined column skips it. Over an outer join, always count the joined
              column — otherwise an empty group reports 1 instead of 0.
            </p>
            <CodeBlock
              code={`SELECT d.name,
       COUNT(*)      AS wrong,   -- Finance shows 1
       COUNT(e.id)   AS right    -- Finance shows 0
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.name;`}
              lang="sql"
              showLineNumbers={false}
            />
          </Card>
        </div>
      </section>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">Ready to practise?</h3>
          <p className="mt-1 text-sm text-fg-muted">
            Every join question in the bank, from predicting a row count to writing a three-table
            query.
          </p>
        </div>
        <ButtonLink to="/sql/joins/practice" className="shrink-0">
          Practise joins
          <ArrowRight size={15} />
        </ButtonLink>
      </Card>
    </div>
  );
}

const JOIN_TAGS = [
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL OUTER JOIN',
  'CROSS JOIN',
  'self join',
  'ON',
  'ON vs WHERE',
  'three-table join',
  'anti-join',
  'LEFT JOIN IS NULL',
  'COUNT with JOIN',
  'duplicate rows',
  'one-to-many',
  'many-to-many',
  'join comparison',
  'table alias',
  'qualified column',
];

export function SqlJoinPractice() {
  return (
    <SqlTagPractice
      tags={JOIN_TAGS}
      title="JOIN practice"
      subtitle="Every question in the bank tagged with a join concept, across all three levels."
      backTo="/sql/joins"
      backLabel="Back to the JOIN lab"
    />
  );
}

/* --------------------------------------------------- clause combinations */

interface Combination {
  id: string;
  name: string;
  tags: string[];
  body: string;
  example: string;
}

const COMBINATIONS: Combination[] = [
  {
    id: 'where-order',
    name: 'WHERE + ORDER BY',
    tags: ['WHERE', 'ORDER BY'],
    body: 'Filter, then sort what is left. ORDER BY runs after SELECT, so it may use a select-list alias; WHERE may not.',
    example: `SELECT name, salary * 12 AS annual
FROM employees
WHERE salary > 3000
ORDER BY annual DESC;`,
  },
  {
    id: 'where-distinct',
    name: 'WHERE + DISTINCT',
    tags: ['WHERE', 'DISTINCT'],
    body: 'DISTINCT applies to the rows WHERE let through, and it deduplicates the whole select list, not one column.',
    example: `SELECT DISTINCT department_id
FROM employees
WHERE salary > 3000;`,
  },
  {
    id: 'where-group',
    name: 'WHERE + GROUP BY',
    tags: ['WHERE', 'GROUP BY'],
    body: 'WHERE runs first, so it decides which rows reach the aggregate. Filtering early means fewer rows to group.',
    example: `SELECT department_id, COUNT(*) AS high_earners
FROM employees
WHERE salary > 4000
GROUP BY department_id;`,
  },
  {
    id: 'group-having',
    name: 'GROUP BY + HAVING',
    tags: ['GROUP BY', 'HAVING', 'WHERE vs HAVING'],
    body: 'HAVING tests the finished group. It is the only clause that can see an aggregate, because it is the first one to run after grouping.',
    example: `SELECT department_id, COUNT(*) AS headcount
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 3;`,
  },
  {
    id: 'join-where',
    name: 'JOIN + WHERE',
    tags: ['INNER JOIN', 'ON vs WHERE', 'WHERE'],
    body: 'Join first, then filter the joined rows. Over an outer join this is exactly where rows get lost — move the condition into ON to keep them.',
    example: `SELECT e.name, d.name AS dept
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE d.budget > 250000;`,
  },
  {
    id: 'join-group',
    name: 'JOIN + GROUP BY',
    tags: ['LEFT JOIN', 'GROUP BY', 'COUNT with JOIN'],
    body: 'Count the joined column, not *, or an outer join will report 1 for a group that should read 0.',
    example: `SELECT d.name, COUNT(e.id) AS headcount
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.name;`,
  },
  {
    id: 'join-group-having',
    name: 'JOIN + GROUP BY + HAVING',
    tags: ['INNER JOIN', 'GROUP BY', 'HAVING'],
    body: 'Three stages in one query: build the rows, collapse them, then keep only the groups that qualify.',
    example: `SELECT c.name, COUNT(*) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
HAVING COUNT(*) > 3;`,
  },
  {
    id: 'full-pipeline',
    name: 'WHERE + GROUP BY + HAVING + ORDER BY',
    tags: ['logical order', 'GROUP BY', 'HAVING', 'ORDER BY', 'combination'],
    body: 'The complete pipeline. Two filters at two different stages, then a sort that can use the aggregate alias.',
    example: `SELECT department_id, ROUND(AVG(salary), 2) AS avg_pay
FROM employees
WHERE hire_date >= '2019-01-01'
GROUP BY department_id
HAVING AVG(salary) > 4000
ORDER BY avg_pay DESC;`,
  },
  {
    id: 'subquery-aggregate',
    name: 'Subquery + aggregate',
    tags: ['scalar subquery', 'AVG', 'second highest'],
    body: 'An aggregate cannot appear in WHERE, so compute it in a subquery and compare against the single value it returns.',
    example: `SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`,
  },
  {
    id: 'exists-correlated',
    name: 'EXISTS + correlated subquery',
    tags: ['EXISTS', 'NOT EXISTS', 'correlated subquery'],
    body: 'The inner query references the outer row, so it asks a per-row question. Unlike a join, it cannot duplicate rows.',
    example: `SELECT d.name
FROM departments d
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.department_id = d.id
);`,
  },
  {
    id: 'cte-join',
    name: 'CTE + JOIN',
    tags: ['CTE', 'CTE + JOIN', 'WITH'],
    body: 'Aggregate in a named step, then join the result. Reads top to bottom instead of inside out.',
    example: `WITH counts AS (
  SELECT department_id AS did, COUNT(*) AS n
  FROM employees GROUP BY department_id
)
SELECT d.name, c.n
FROM departments d
JOIN counts c ON c.did = d.id;`,
  },
  {
    id: 'window-partition',
    name: 'Window function + PARTITION BY',
    tags: ['ROW_NUMBER', 'PARTITION BY', 'top-N per group'],
    body: 'Restart the calculation per group while keeping every row — then filter in an outer query, because WHERE runs before the window.',
    example: `SELECT department_id, name FROM (
  SELECT department_id, name,
         ROW_NUMBER() OVER (
           PARTITION BY department_id ORDER BY salary DESC
         ) AS rn
  FROM employees WHERE department_id IS NOT NULL
) t WHERE rn = 1;`,
  },
  {
    id: 'case-group',
    name: 'CASE WHEN + GROUP BY',
    tags: ['CASE WHEN', 'conditional aggregation', 'pivot'],
    body: 'One conditional aggregate per output column turns rows into columns. Leave the ELSE off so COUNT skips the non-matching rows.',
    example: `SELECT department_id,
       COUNT(CASE WHEN salary > 4000 THEN 1 END) AS high,
       COUNT(CASE WHEN salary <= 4000 THEN 1 END) AS low
FROM employees
GROUP BY department_id;`,
  },
  {
    id: 'leftjoin-isnull',
    name: 'LEFT JOIN + IS NULL',
    tags: ['anti-join', 'LEFT JOIN IS NULL', 'IS NULL'],
    body: 'The anti-join. Keep every left row, then keep only the ones where the join produced nothing.',
    example: `SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;`,
  },
  {
    id: 'countdistinct-join',
    name: 'COUNT(DISTINCT) + JOIN',
    tags: ['COUNT(DISTINCT)', 'duplicate rows', 'three-table join'],
    body: 'When a second join multiplies rows, DISTINCT inside the count is what stops the same entity being counted twice.',
    example: `SELECT c.country, COUNT(DISTINCT o.id) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.country;`,
  },
];

export function SqlCombinations() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
          Clause combinations
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Real queries use several clauses at once, and most SQL bugs come from assuming they run in
          the order they are written. They do not.
        </p>
      </div>

      <Card className="p-5 md:p-6">
        <SectionHeading
          title="The logical processing order"
          icon={<ListOrdered size={18} />}
          description="A conceptual model, not a promise about what the engine physically does — the planner may reorder anything, as long as the answer matches."
        />
        <ol className="flex flex-wrap items-center gap-2">
          {[
            'FROM / JOIN',
            'WHERE',
            'GROUP BY',
            'HAVING',
            'SELECT',
            'DISTINCT',
            'ORDER BY',
            'LIMIT',
          ].map((clause, i, all) => (
            <li key={clause} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-raised px-2.5 py-1.5 font-mono text-xs font-semibold text-fg-soft">
                <span className="text-fg-faint">{i + 1}</span>
                {clause}
              </span>
              {i < all.length - 1 && <ArrowRight size={13} className="text-fg-faint" />}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Two consequences follow directly. WHERE cannot use a select-list alias, because SELECT has
          not run yet — but ORDER BY can. And WHERE cannot use an aggregate, because GROUP BY has
          not run yet — that is what HAVING is for.
        </p>
      </Card>

      <section>
        <SectionHeading
          title="Combinations worth drilling"
          icon={<Layers size={18} />}
          description="Each one links to the matching questions in the bank."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 md:gap-5">
          {COMBINATIONS.map((combo) => (
            <Card key={combo.id} className="flex flex-col p-5">
              <h3 className="font-mono text-sm font-semibold text-fg">{combo.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{combo.body}</p>
              <CodeBlock code={combo.example} lang="sql" showLineNumbers={false} />
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {combo.tags.slice(0, 3).map((tag) => (
                  <Pill key={tag} className="font-mono text-[10px]">
                    {tag}
                  </Pill>
                ))}
                <ButtonLink
                  to={'/sql/combinations/practice?set=' + combo.id}
                  variant="secondary"
                  size="sm"
                  className="ml-auto"
                >
                  Practise
                  <ArrowRight size={13} />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SqlCombinationPractice() {
  const [params] = useSearchParams();
  const setId = params.get('set');
  const combo = COMBINATIONS.find((c) => c.id === setId);

  const tags = combo ? combo.tags : ['combination', 'logical order'];

  return (
    <SqlTagPractice
      tags={tags}
      title={combo ? combo.name : 'Combination practice'}
      subtitle={
        combo
          ? combo.body
          : 'Questions that need several clauses working together, drawn from across the bank.'
      }
      backTo="/sql/combinations"
      backLabel="Back to combinations"
    />
  );
}
