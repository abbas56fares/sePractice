#!/usr/bin/env node
/**
 * Question-bank verifier.
 *
 * Two independent passes:
 *
 *  1. Structural — runs `validateBank` (the same check the Settings page shows):
 *     duplicate ids, missing options, unexplained distractors, bad topic refs.
 *
 *  2. Behavioural — for every question carrying a `verify` spec, writes the
 *     snippet to a temp `Main.java`, compiles and runs it with a real JDK, and
 *     compares what actually happened against the keyed answer:
 *
 *       stdout          the program must print exactly the expected text
 *                       (defaults to the text of the correct option)
 *       compile-error   javac must reject it
 *       runtime-throws  it must compile, then throw the named exception
 *
 * Exits non-zero if anything fails, so it can gate a commit or a build.
 *
 * Usage: node scripts/verify-bank.mjs [--only <id-substring>] [--structural]
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));

/** Prefer the Homebrew JDK, then whatever is on PATH. */
function findJdk() {
  const candidates = [
    process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin') : null,
    '/opt/homebrew/opt/openjdk@21/bin',
    '/opt/homebrew/opt/openjdk/bin',
    '/usr/local/opt/openjdk@21/bin',
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, 'javac'))) return dir;
  }
  return null;
}

/** Bundle the TS question bank to a temp ESM file so Node can import it. */
async function loadBank(outDir) {
  const outfile = join(outDir, 'bank.mjs');
  await build({
    entryPoints: [join(root, 'src/data/bank-entry.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  return import(outfile);
}

const E = String.fromCharCode(27);
const C = {
  dim: (s) => E + '[2m' + s + E + '[0m',
  red: (s) => E + '[31m' + s + E + '[0m',
  green: (s) => E + '[32m' + s + E + '[0m',
  yellow: (s) => E + '[33m' + s + E + '[0m',
  bold: (s) => E + '[1m' + s + E + '[0m',
};

function normalise(s) {
  return s.replace(/\r\n/g, '\n').replace(/\s+$/, '');
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const structuralOnly = args.includes('--structural');

  const work = mkdtempSync(join(tmpdir(), 'java-bank-'));
  let failures = 0;

  try {
    const bank = await loadBank(work);
    const { QUESTIONS, validateBank } = bank;

    /* ---------------------------------------------------------- structural */
    const issues = validateBank(QUESTIONS);
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');

    console.log(C.bold(`\nStructural check — ${QUESTIONS.length} questions`));
    for (const i of errors) console.log(`  ${C.red('ERROR')} ${i.questionId}: ${i.message}`);
    for (const i of warnings) console.log(`  ${C.yellow('warn ')} ${i.questionId}: ${i.message}`);
    if (!issues.length) console.log(`  ${C.green('ok')} no structural problems`);
    failures += errors.length;

    if (structuralOnly) return failures;

    /* --------------------------------------------------------- behavioural */
    const jdkBin = findJdk();
    if (!jdkBin) {
      console.log(
        C.yellow('\nNo JDK found — skipping the compile-and-run pass.') +
          '\n  Install one (brew install openjdk@21) or set JAVA_HOME, then re-run.'
      );
      return failures;
    }

    const javac = join(jdkBin, 'javac');
    const java = join(jdkBin, 'java');
    const { stdout: ver } = await execFileAsync(javac, ['-version']).catch((e) => ({
      stdout: String(e),
    }));

    let checked = 0;
    const runnable = QUESTIONS.filter((q) => q.verify && (!only || q.id.includes(only)));
    console.log(C.bold(`\nJDK check — ${runnable.length} verifiable questions (${ver.trim()})`));

    for (const q of runnable) {
      const file = join(work, 'Main.java');
      writeFileSync(file, q.code + '\n');
      const correct = q.options.find((o) => o.id === q.answer);
      const label = `${q.id} ${C.dim(q.verify.mode)}`;

      // Compile.
      let compileErr = null;
      try {
        await execFileAsync(javac, ['-d', work, file], { timeout: 30000 });
      } catch (e) {
        compileErr = (e.stderr || e.message || '').trim();
      }

      if (q.verify.mode === 'compile-error') {
        if (compileErr) {
          checked++;
        } else {
          failures++;
          console.log(`  ${C.red('FAIL')} ${label} — expected a compile error, but it compiled`);
        }
        continue;
      }

      if (compileErr) {
        failures++;
        console.log(
          `  ${C.red('FAIL')} ${label} — unexpected compile error:\n${C.dim(indent(compileErr))}`
        );
        continue;
      }

      // Run.
      let stdout = '';
      let runErr = null;
      try {
        const r = await execFileAsync(java, ['-cp', work, 'Main'], { timeout: 30000 });
        stdout = r.stdout;
      } catch (e) {
        stdout = e.stdout || '';
        runErr = (e.stderr || e.message || '').trim();
      }

      if (q.verify.mode === 'runtime-throws') {
        const wanted = q.verify.expect;
        if (!runErr) {
          failures++;
          console.log(`  ${C.red('FAIL')} ${label} — expected a thrown ${wanted}, but it exited cleanly`);
        } else if (wanted && !runErr.includes(wanted)) {
          failures++;
          console.log(
            `  ${C.red('FAIL')} ${label} — expected ${wanted}, got:\n${C.dim(indent(runErr))}`
          );
        } else {
          checked++;
        }
        continue;
      }

      // mode === 'stdout'
      if (runErr) {
        failures++;
        console.log(`  ${C.red('FAIL')} ${label} — threw at runtime:\n${C.dim(indent(runErr))}`);
        continue;
      }

      const expected = normalise(q.verify.expect ?? correct.text);
      const actual = normalise(stdout);
      if (expected === actual) {
        checked++;
      } else {
        failures++;
        console.log(
          `  ${C.red('FAIL')} ${label}\n` +
            `         keyed answer (${q.answer}): ${JSON.stringify(expected)}\n` +
            `         actual output:            ${JSON.stringify(actual)}`
        );
      }
    }

    if (failures === 0) {
      console.log(`  ${C.green('ok')} ${checked}/${runnable.length} answer keys confirmed by the JDK`);
    } else {
      console.log(`  ${checked} confirmed, ${C.red(failures + ' failed')}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  return failures;
}

function indent(s) {
  return s
    .split('\n')
    .map((l) => '           ' + l)
    .join('\n');
}

main()
  .then((failures) => {
    console.log(failures === 0 ? C.green('\nBank verified.\n') : C.red(`\n${failures} failure(s).\n`));
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(C.red('Verifier crashed:'), e);
    process.exit(2);
  });
