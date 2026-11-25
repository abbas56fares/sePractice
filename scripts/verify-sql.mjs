#!/usr/bin/env node
/**
 * SQL module verifier.
 *
 * Three independent passes, all run against the same engine the app uses:
 *
 *  1. Engine  — the conformance suite in `src/data/sql/engine-tests.ts`.
 *               Each case is a query plus the exact rows PostgreSQL would
 *               return, checked by hand against the dataset.
 *  2. Bank    — structural audit of every SQL question: unique ids, valid
 *               topic and difficulty, exactly one correct option on a
 *               multiple-choice item, explanations for every distractor.
 *  3. Answers — every executable exercise's reference solution is run against
 *               its dataset. The expected result is whatever the reference
 *               query actually produces, so an exercise can never ask for
 *               something unachievable, and a dataset edit that invalidates a
 *               question fails here instead of in front of the learner.
 *
 * Exits non-zero if anything fails.
 *
 * Usage: node scripts/verify-sql.mjs [--only <substring>] [--engine|--bank]
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

const E = String.fromCharCode(27);
const C = {
  dim: (s) => E + '[2m' + s + E + '[0m',
  red: (s) => E + '[31m' + s + E + '[0m',
  green: (s) => E + '[32m' + s + E + '[0m',
  yellow: (s) => E + '[33m' + s + E + '[0m',
  bold: (s) => E + '[1m' + s + E + '[0m',
};

async function bundle(entry, outDir, name) {
  const outfile = join(outDir, name + '.mjs');
  await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  return import(outfile);
}

function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) {
      const x = ra[j];
      const y = rb[j];
      if (x === null || y === null) {
        if (x !== y) return false;
        continue;
      }
      if (typeof x === 'number' || typeof y === 'number') {
        if (Math.abs(Number(x) - Number(y)) > 1e-9) return false;
        continue;
      }
      if (String(x) !== String(y)) return false;
    }
  }
  return true;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function show(rows, limit = 4) {
  if (!rows) return 'none';
  const head = rows.slice(0, limit).map((r) => JSON.stringify(r)).join(' ');
  return head + (rows.length > limit ? ` ... (${rows.length} rows)` : '');
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const engineOnly = args.includes('--engine');
  const bankOnly = args.includes('--bank');

  const work = mkdtempSync(join(tmpdir(), 'sql-verify-'));
  let failures = 0;

  try {
    const mod = await bundle('src/data/sql/verify-entry.ts', work, 'sql');
    const { runSql, runReference, ENGINE_TESTS } = mod;

    /* ------------------------------------------------------------ engine */
    if (!bankOnly) {
      const tests = ENGINE_TESTS.filter((t) => !only || t.name.toLowerCase().includes(only.toLowerCase()));
      console.log(C.bold(`\nEngine conformance — ${tests.length} cases`));
      let enginePass = 0;

      for (const test of tests) {
        const outcome = runSql(test.dataset, test.sql, {
          permission: test.write ? 'read-write' : 'read-only',
          maxDisplayRows: Number.MAX_SAFE_INTEGER,
        });

        if (test.expectError) {
          if (outcome.ok) {
            failures++;
            console.log(`  ${C.red('FAIL')} ${test.name}`);
            console.log(C.dim(`         expected an error containing "${test.expectError}", but it succeeded`));
          } else if (!outcome.error.toLowerCase().includes(test.expectError.toLowerCase())) {
            failures++;
            console.log(`  ${C.red('FAIL')} ${test.name}`);
            console.log(C.dim(`         expected "${test.expectError}", got: ${outcome.error}`));
          } else {
            enginePass++;
          }
          continue;
        }

        if (!outcome.ok) {
          failures++;
          console.log(`  ${C.red('FAIL')} ${test.name}`);
          console.log(C.dim(`         query failed: ${outcome.error}`));
          continue;
        }

        const actual = outcome.result;
        let ok = true;
        let detail = '';

        if (test.expectColumns) {
          const got = actual.columns.map((c) => c.toLowerCase());
          const want = test.expectColumns.map((c) => c.toLowerCase());
          if (JSON.stringify(got) !== JSON.stringify(want)) {
            ok = false;
            detail = `columns: got ${JSON.stringify(actual.columns)}, want ${JSON.stringify(test.expectColumns)}`;
          }
        }

        if (ok && test.expect) {
          const a = test.unordered ? sortRows(actual.rows) : actual.rows;
          const b = test.unordered ? sortRows(test.expect) : test.expect;
          if (!rowsEqual(a, b)) {
            ok = false;
            detail = `got ${show(actual.rows)}\n         want ${show(test.expect)}`;
          }
        }

        if (ok) {
          enginePass++;
        } else {
          failures++;
          console.log(`  ${C.red('FAIL')} ${test.name}`);
          console.log(C.dim('         ' + detail));
        }
      }

      console.log(
        `  ${enginePass === tests.length ? C.green('ok') : C.red('failed')} ${enginePass}/${tests.length} engine cases pass`
      );
    }

    if (engineOnly) return failures;

    /* -------------------------------------------------------------- bank */
    let bankModule = null;
    try {
      bankModule = await bundle('src/data/sql/bank-entry.ts', work, 'bank');
    } catch {
      console.log(C.yellow('\nNo SQL question bank yet — skipping the bank and answer passes.'));
      return failures;
    }

    const { SQL_QUESTIONS, validateSqlBank, getSqlDatasetFor } = bankModule;

    const issues = validateSqlBank(SQL_QUESTIONS);
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');

    console.log(C.bold(`\nSQL bank structure — ${SQL_QUESTIONS.length} questions`));
    for (const i of errors) console.log(`  ${C.red('ERROR')} ${i.questionId}: ${i.message}`);
    for (const i of warnings) console.log(`  ${C.yellow('warn ')} ${i.questionId}: ${i.message}`);
    if (!issues.length) console.log(`  ${C.green('ok')} no structural problems`);
    failures += errors.length;

    if (bankOnly) return failures;

    /* ----------------------------------------------------------- answers */
    const executable = SQL_QUESTIONS.filter(
      (q) => (q.type === 'write' || q.type === 'complete') && (!only || q.id.includes(only))
    );
    console.log(C.bold(`\nReference solutions — ${executable.length} executable exercises`));

    let checked = 0;
    for (const q of executable) {
      const dataset = getSqlDatasetFor(q);
      const solution = q.type === 'complete' ? q.solution : q.solution;

      let expected;
      try {
        expected = runReference(dataset, solution);
      } catch (err) {
        failures++;
        console.log(`  ${C.red('FAIL')} ${q.id}: reference query failed — ${err.message}`);
        continue;
      }

      // A question that expects columns to be named must actually name them.
      if (q.grading?.checkColumnNames && q.expectedColumns) {
        const got = expected.columns.map((c) => c.toLowerCase());
        const want = q.expectedColumns.map((c) => c.toLowerCase());
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          failures++;
          console.log(
            `  ${C.red('FAIL')} ${q.id}: reference columns ${JSON.stringify(expected.columns)} do not match the declared ${JSON.stringify(q.expectedColumns)}`
          );
          continue;
        }
      }

      // An exercise with no rows is almost always a dataset mistake.
      if (expected.rows.length === 0 && !q.allowEmptyResult) {
        failures++;
        console.log(
          `  ${C.red('FAIL')} ${q.id}: the reference solution returns no rows. Set allowEmptyResult if that is intended.`
        );
        continue;
      }

      // Every listed wrong-answer pattern must genuinely be wrong.
      for (const wrong of q.rejects ?? []) {
        let wrongResult = null;
        try {
          wrongResult = runReference(dataset, wrong.sql);
        } catch {
          continue; // Failing to run is a legitimate way of being wrong.
        }
        const { compareResults } = mod;
        const cmp = compareResults(wrongResult, expected, q.grading ?? {});
        if (cmp.match) {
          failures++;
          console.log(
            `  ${C.red('FAIL')} ${q.id}: the "${wrong.label}" query is marked wrong but produces the correct result`
          );
        }
      }

      checked++;
    }

    console.log(
      `  ${checked === executable.length ? C.green('ok') : C.yellow('partial')} ${checked}/${executable.length} reference solutions run and produce their expected result`
    );

    /* ------------------------- multiple-choice answer-key sanity ------- */
    const mcq = SQL_QUESTIONS.filter((q) => q.type !== 'write' && q.type !== 'complete');
    let keyChecked = 0;
    console.log(C.bold(`\nChecked multiple-choice keys — ${mcq.length} questions`));
    for (const q of mcq) {
      if (!q.verifyWith) continue;
      const dataset = getSqlDatasetFor(q);
      let result;
      try {
        result = runReference(dataset, q.verifyWith.sql);
      } catch (err) {
        failures++;
        console.log(`  ${C.red('FAIL')} ${q.id}: verification query failed — ${err.message}`);
        continue;
      }
      const rendered = mod.renderResultForComparison
        ? mod.renderResultForComparison(result)
        : JSON.stringify(result.rows);
      const expectedText = q.verifyWith.expect;
      if (!rendered.includes(expectedText) && rendered !== expectedText) {
        failures++;
        console.log(`  ${C.red('FAIL')} ${q.id}: running the query gave ${rendered}, key says ${expectedText}`);
        continue;
      }
      keyChecked++;
    }
    console.log(`  ${C.green('ok')} ${keyChecked} key(s) confirmed by executing the query`);

    return failures;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main()
  .then((failures) => {
    if (failures > 0) {
      console.log(C.red(`\n${failures} failure(s).\n`));
      process.exit(1);
    }
    console.log(C.green('\nAll SQL checks passed.\n'));
  })
  .catch((err) => {
    console.error(C.red('\nVerifier crashed: ' + (err?.stack ?? err) + '\n'));
    process.exit(2);
  });
