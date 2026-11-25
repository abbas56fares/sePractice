import type { ReactNode } from 'react';
import { AlertTriangle, Database, Table2 } from 'lucide-react';
import type { ResultSet, SqlValue } from '../../lib/sql';
import { displayValue } from '../../lib/sql';
import type { TableDef } from '../../lib/sql';
import { Card } from '../ui';

/**
 * Result and data grids.
 *
 * Both scroll inside their own box so a wide result never makes the page
 * scroll sideways, and NULL is rendered as a distinct token rather than an
 * empty cell — telling NULL from '' by eye is half of several lessons.
 */

function Cell({ value }: { value: SqlValue }) {
  if (value === null || value === undefined) {
    return <span className="font-mono text-[11px] italic text-fg-faint">NULL</span>;
  }
  if (value === '') {
    return <span className="font-mono text-[11px] italic text-fg-faint">&#39;&#39; (empty)</span>;
  }
  return <span className="tabular-nums">{displayValue(value)}</span>;
}

export function ResultGrid({
  result,
  caption,
  truncated,
  totalRows,
  maxHeight = 320,
  highlightRows,
}: {
  result: ResultSet;
  caption?: ReactNode;
  truncated?: boolean;
  totalRows?: number;
  maxHeight?: number;
  /** Row indexes to mark, for a difference view. */
  highlightRows?: Set<number>;
}) {
  if (result.command !== 'SELECT' && result.columns.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-raised px-3.5 py-3 text-sm text-fg-muted">
        {result.command} affected {result.rowsAffected ?? 0} row
        {result.rowsAffected === 1 ? '' : 's'}.
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-hairline">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-raised px-3 py-1.5">
        <span className="label flex items-center gap-1.5">
          <Table2 size={12} />
          {caption ?? 'Result'}
        </span>
        <span className="text-[11px] text-fg-faint">
          {totalRows ?? result.rows.length} row{(totalRows ?? result.rows.length) === 1 ? '' : 's'}
          {' · '}
          {result.columns.length} column{result.columns.length === 1 ? '' : 's'}
        </span>
      </figcaption>

      <div className="scroll-thin overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {result.columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap border-b border-hairline px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, result.columns.length)}
                  className="px-3 py-6 text-center text-sm text-fg-faint"
                >
                  No rows
                </td>
              </tr>
            ) : (
              result.rows.map((row, r) => (
                <tr
                  key={r}
                  className={
                    'border-b border-hairline last:border-0 ' +
                    (highlightRows?.has(r) ? 'bg-bad/10' : '')
                  }
                >
                  {row.map((value, c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-1.5 text-fg-soft">
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {truncated && (
        <p className="flex items-center gap-1.5 border-t border-hairline bg-warn/10 px-3 py-2 text-xs text-fg-muted">
          <AlertTriangle size={12} className="shrink-0 text-warn" />
          Showing the first {result.rows.length} of {totalRows} rows.
        </p>
      )}
    </figure>
  );
}

/** A dataset table rendered with its column types and sample rows. */
export function DataTable({ table, maxRows = 12 }: { table: TableDef; maxRows?: number }) {
  const rows = table.rows.slice(0, maxRows);

  return (
    <figure className="overflow-hidden rounded-lg border border-hairline">
      <figcaption className="border-b border-hairline bg-raised px-3 py-1.5">
        <span className="label flex items-center gap-1.5">
          <Database size={12} />
          {table.name}
        </span>
        {table.description && (
          <p className="mt-0.5 text-[11px] text-fg-faint">{table.description}</p>
        )}
      </figcaption>

      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th
                  key={col.name}
                  scope="col"
                  className="whitespace-nowrap border-b border-hairline px-3 py-2 align-bottom"
                >
                  <span className="block font-mono text-[11px] font-semibold text-fg">
                    {col.name}
                    {col.primaryKey && <span className="ml-1 text-accent-text">PK</span>}
                    {col.references && <span className="ml-1 text-info">FK</span>}
                  </span>
                  <span className="block text-[10px] font-normal uppercase tracking-wider text-fg-faint">
                    {col.type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-hairline last:border-0">
                {row.map((value, c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-1.5 text-fg-soft">
                    <Cell value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.rows.length > maxRows && (
        <p className="border-t border-hairline px-3 py-1.5 text-[11px] text-fg-faint">
          Showing {maxRows} of {table.rows.length} rows.
        </p>
      )}
    </figure>
  );
}

/** Every table in a dataset, with the foreign keys spelled out. */
export function SchemaViewer({
  tables,
  description,
  maxRows = 12,
}: {
  tables: TableDef[];
  description?: string;
  maxRows?: number;
}) {
  const links = tables.flatMap((t) =>
    t.columns
      .filter((c) => c.references)
      .map((c) => `${t.name}.${c.name} → ${c.references as string}`)
  );

  return (
    <div className="flex flex-col gap-4">
      {description && <p className="text-sm text-fg-muted">{description}</p>}

      {links.length > 0 && (
        <Card className="p-3.5">
          <span className="label">Relationships</span>
          <ul className="mt-2 flex flex-col gap-1">
            {links.map((link) => (
              <li key={link} className="font-mono text-xs text-fg-muted">
                {link}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tables.map((table) => (
        <DataTable key={table.name} table={table} maxRows={maxRows} />
      ))}
    </div>
  );
}
