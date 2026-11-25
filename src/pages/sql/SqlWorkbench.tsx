import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Play, RotateCcw, ShieldCheck, Terminal } from 'lucide-react';
import { SQL_DATASETS } from '../../data/sql/datasets';
import { runSql, schemaDdl, type RunOutcome } from '../../lib/sql';
import { CodeBlock } from '../../components/CodeBlock';
import { SqlEditor } from '../../components/sql/SqlEditor';
import { DataTable, ResultGrid } from '../../components/sql/SqlResultTable';
import { Button, Card, Pill, SectionHeading } from '../../components/ui';

const STARTERS: Record<string, string> = {
  joins: `SELECT e.name AS employee, d.name AS department
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
ORDER BY e.id;`,
  company: `SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
WHERE department_id IS NOT NULL
GROUP BY department_id
ORDER BY avg_salary DESC;`,
  sales: `SELECT c.name AS customer, COUNT(o.id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY orders DESC, customer;`,
};

/**
 * A free SQL editor over any practice dataset.
 *
 * Nothing is graded here and nothing is recorded. Writes are permitted so
 * INSERT, UPDATE and DELETE can be explored — they land in a copy of the
 * dataset built fresh for each run, so the data is identical next time.
 */
export function SqlWorkbench() {
  const [datasetId, setDatasetId] = useState('company');
  const [sql, setSql] = useState(STARTERS.company ?? '');
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [showSchema, setShowSchema] = useState(true);

  const dataset = useMemo(
    () => SQL_DATASETS.find((d) => d.id === datasetId) ?? SQL_DATASETS[0],
    [datasetId]
  );

  const run = useCallback(() => {
    if (!dataset) return;
    setOutcome(runSql(dataset, sql, { permission: 'read-write' }));
  }, [dataset, sql]);

  const switchDataset = (id: string) => {
    setDatasetId(id);
    setSql(STARTERS[id] ?? '');
    setOutcome(null);
  };

  if (!dataset) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">SQL workbench</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          A scratchpad over the practice datasets. Nothing here is graded or recorded — write
          whatever you like, including INSERT, UPDATE and DELETE.
        </p>
      </div>

      <Card className="flex items-start gap-3 p-4">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-ok" />
        <p className="text-sm leading-relaxed text-fg-muted">
          Every run builds a fresh copy of the dataset, so your changes never outlive the query and
          can never reach another page or your saved progress. The engine is a pure function over
          in-memory arrays: there is no filesystem, no network and no server to reach.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Dataset">
        <span className="label">Dataset</span>
        {SQL_DATASETS.map((d) => (
          <Button
            key={d.id}
            size="sm"
            variant={datasetId === d.id ? 'primary' : 'secondary'}
            onClick={() => switchDataset(d.id)}
            aria-pressed={datasetId === d.id}
          >
            <Database size={14} />
            {d.name}
          </Button>
        ))}
      </div>

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label flex items-center gap-1.5">
            <Terminal size={12} />
            Query
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSql(STARTERS[datasetId] ?? '');
                setOutcome(null);
              }}
            >
              <RotateCcw size={14} />
              Reset
            </Button>
            <Button size="sm" onClick={run} disabled={!sql.trim()}>
              <Play size={14} />
              Run query
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <SqlEditor
            value={sql}
            onChange={setSql}
            onRun={run}
            minRows={8}
            {...(outcome && !outcome.ok && outcome.errorLine !== undefined
              ? { errorLine: outcome.errorLine }
              : {})}
          />
        </div>

        <p className="mt-2 text-xs text-fg-faint">
          <kbd className="font-mono">Ctrl</kbd>/<kbd className="font-mono">⌘</kbd>+
          <kbd className="font-mono">Enter</kbd> runs · separate several statements with{' '}
          <kbd className="font-mono">;</kbd>
        </p>

        {outcome && (
          <div className="mt-5">
            {outcome.ok && outcome.result ? (
              <>
                <ResultGrid
                  result={outcome.result}
                  caption="Result"
                  maxHeight={420}
                  {...(outcome.truncated ? { truncated: true } : {})}
                  {...(outcome.totalRows !== undefined ? { totalRows: outcome.totalRows } : {})}
                />
                <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-fg-faint">
                  <span>Ran in {outcome.elapsedMs} ms</span>
                  <span>
                    {outcome.statementCount} statement{outcome.statementCount === 1 ? '' : 's'}
                  </span>
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-bad/40 bg-bad/10 px-3.5 py-3">
                <span className="label text-bad">Query failed</span>
                <p className="mt-1 text-sm text-fg-soft">{outcome.error}</p>
                {outcome.errorLine !== undefined && (
                  <p className="mt-1 text-xs text-fg-faint">Around line {outcome.errorLine}.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <section>
        <SectionHeading
          title={dataset.name + ' schema'}
          icon={<Database size={18} />}
          description={dataset.description}
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowSchema((s) => !s)}>
              {showSchema ? 'Hide tables' : 'Show tables'}
            </Button>
          }
        />

        {showSchema && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {dataset.tables.map((t) => (
                <Pill key={t.name} className="font-mono">
                  {t.name} ({t.rows.length} rows)
                </Pill>
              ))}
            </div>

            {dataset.tables.map((table) => (
              <div key={table.name} className="flex flex-col gap-2">
                <DataTable table={table} maxRows={20} />
                <details className="rounded-lg border border-hairline bg-surface">
                  <summary className="cursor-pointer px-3.5 py-2 text-xs font-medium text-fg-muted">
                    CREATE TABLE {table.name}
                  </summary>
                  <div className="px-3.5 pb-1">
                    <CodeBlock code={schemaDdl(table)} lang="sql" showLineNumbers={false} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
