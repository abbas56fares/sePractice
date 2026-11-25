/** Entry point the SQL verifier bundles — keeps the script free of app imports. */
import type { ResultSet } from '../../lib/sql';

export { runSql, runReference, compareResults, buildDatabase, SqlError } from '../../lib/sql';
export { SQL_DATASETS, getDataset, companyDataset, joinsDataset, salesDataset } from './datasets';
export { ENGINE_TESTS } from './engine-tests';

/**
 * Canonical rendering of a result set, so a question's `verifyWith.expect`
 * can be authored once and compared mechanically by the verifier.
 */
export function renderResultForComparison(result: ResultSet): string {
  return JSON.stringify(result.rows);
}
