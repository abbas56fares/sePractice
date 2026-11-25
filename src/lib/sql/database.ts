/**
 * Practice databases.
 *
 * A dataset is plain data: table definitions plus rows. Every run builds a
 * fresh `Database` by deep-copying the dataset, so a learner's UPDATE or
 * DELETE can never leak into another exercise, another attempt, or the
 * definition itself.
 */

import type { SqlValue } from './ast';
import type { Database, TableData } from './execute';

export type ColumnType = 'integer' | 'numeric' | 'text' | 'date' | 'boolean';

export interface ColumnDef {
  name: string;
  type: ColumnType;
  primaryKey?: boolean;
  nullable?: boolean;
  /** `table.column` this column points at, for the schema viewer. */
  references?: string;
  note?: string;
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  rows: SqlValue[][];
  description?: string;
}

export interface SqlDataset {
  id: string;
  name: string;
  description: string;
  tables: TableDef[];
}

/** Fresh, isolated copy of a dataset. Mutating it cannot affect the original. */
export function buildDatabase(dataset: SqlDataset): Database {
  const tables = new Map<string, TableData>();
  for (const table of dataset.tables) {
    tables.set(table.name.toLowerCase(), {
      name: table.name,
      columns: table.columns.map((c) => c.name),
      columnTypes: table.columns.map((c) => c.type),
      rows: table.rows.map((row) => [...row]),
    });
  }
  return { tables };
}

/** Merges several datasets into one namespace, for cross-dataset exercises. */
export function combineDatasets(id: string, name: string, parts: SqlDataset[]): SqlDataset {
  const tables: TableDef[] = [];
  for (const part of parts) {
    for (const table of part.tables) {
      if (tables.some((t) => t.name === table.name)) continue;
      tables.push(table);
    }
  }
  return {
    id,
    name,
    description: parts.map((p) => p.description).join(' '),
    tables,
  };
}

export function datasetTable(dataset: SqlDataset, name: string): TableDef | undefined {
  return dataset.tables.find((t) => t.name.toLowerCase() === name.toLowerCase());
}

/** `CREATE TABLE` text for the schema viewer — generated, never hand-written. */
export function schemaDdl(table: TableDef): string {
  const typeName: Record<ColumnType, string> = {
    integer: 'INTEGER',
    numeric: 'NUMERIC(10,2)',
    text: 'TEXT',
    date: 'DATE',
    boolean: 'BOOLEAN',
  };

  const lines = table.columns.map((c) => {
    const bits = [`  ${c.name}`, typeName[c.type]];
    if (c.primaryKey) bits.push('PRIMARY KEY');
    else if (c.nullable === false) bits.push('NOT NULL');
    if (c.references) bits.push(`REFERENCES ${c.references.split('.')[0]}(${c.references.split('.')[1]})`);
    return bits.join(' ');
  });

  return `CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n);`;
}
