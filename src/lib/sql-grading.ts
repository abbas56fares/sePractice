/**
 * Grading a SQL answer.
 *
 * Choice questions compare an option id. Executable questions are graded by
 * *running* the learner's query against a private copy of the exercise
 * dataset and comparing its result with the result of the reference solution
 * run the same way — never by matching query text, so formatting, aliases and
 * clause order are all free.
 *
 * Feedback tries to name the kind of mistake (an extra row, a missing
 * grouping column, the wrong join) without handing over the answer.
 */

import type { SqlQuestion, SqlExecutableQuestion } from '../types/sql';
import { isExecutable } from '../types/sql';
import type { OptionId } from '../types';
import {
  compareResults,
  runReference,
  runSql,
  SqlError,
  type CompareResult,
  type ResultSet,
  type SqlDataset,
} from './sql';

export interface GradeResult {
  correct: boolean;
  /** One-line verdict shown at the top of the feedback panel. */
  headline: string;
  /** Specific, actionable detail. Empty when the answer was correct. */
  detail?: string;
  /** The learner's result, for the output grid. */
  actual?: ResultSet;
  /** The reference result. Shown only once the answer has been revealed. */
  expected?: ResultSet;
  /** Rows the comparison flagged, for the difference panel. */
  mismatch?: CompareResult;
  /** The query failed to run at all. */
  errored?: boolean;
  elapsedMs?: number;
}

export function gradeChoice(question: SqlQuestion, selected: OptionId | undefined): boolean {
  if (isExecutable(question) || selected === undefined) return false;
  return selected === question.answer;
}

/** Patterns worth naming before falling back on the generic comparison text. */
function diagnose(question: SqlExecutableQuestion, sql: string): string | undefined {
  const normalised = sql.toLowerCase().replace(/\s+/g, ' ');

  for (const mistake of question.commonMistakes ?? []) {
    if (new RegExp(mistake.pattern, 'i').test(normalised)) return mistake.advice;
  }

  // A handful of checks that apply to any exercise.
  if (/\b(where|and|or)\s+\S+\s*=\s*null\b/.test(normalised)) {
    return 'A comparison with NULL is never true. Use IS NULL or IS NOT NULL.';
  }
  if (/\bhaving\b/.test(normalised) && !/\bgroup by\b/.test(normalised) && !/\bcount\s*\(|\bsum\s*\(|\bavg\s*\(|\bmin\s*\(|\bmax\s*\(/.test(normalised)) {
    return 'HAVING filters groups. Without an aggregate or a GROUP BY, you probably want WHERE.';
  }
  return undefined;
}

export function gradeExecutable(
  question: SqlExecutableQuestion,
  dataset: SqlDataset,
  sql: string
): GradeResult {
  if (!sql.trim()) {
    return { correct: false, headline: 'Write a query before submitting.' };
  }

  const permission = question.permission ?? 'read-only';
  const outcome = runSql(dataset, sql, { permission });

  if (!outcome.ok || !outcome.result) {
    return {
      correct: false,
      errored: true,
      headline: 'Your query did not run.',
      detail: outcome.error,
      elapsedMs: outcome.elapsedMs,
    };
  }

  let expected: ResultSet;
  try {
    expected = runReference(dataset, question.solution);
  } catch (err) {
    // A broken reference is a bank bug, not a learner mistake. Say so plainly
    // rather than marking a possibly-correct answer wrong.
    return {
      correct: false,
      headline: 'This exercise could not be graded.',
      detail:
        'Its reference solution failed to run: ' +
        (err instanceof SqlError ? err.message : String(err)) +
        '. Please report it — your answer was not marked wrong.',
      actual: outcome.result,
    };
  }

  const comparison = compareResults(outcome.result, expected, question.grading ?? {});

  if (comparison.match) {
    return {
      correct: true,
      headline: 'Correct — your query returns exactly the expected result.',
      actual: outcome.result,
      expected,
      elapsedMs: outcome.elapsedMs,
    };
  }

  const hint = diagnose(question, sql);

  return {
    correct: false,
    headline: 'Not quite — the result does not match.',
    detail: [comparison.message, hint].filter(Boolean).join(' '),
    actual: outcome.result,
    expected,
    mismatch: comparison,
    elapsedMs: outcome.elapsedMs,
  };
}

/** Grades either kind of question, for the exam scorer. */
export function gradeAnswer(
  question: SqlQuestion,
  dataset: SqlDataset,
  answer: { option?: OptionId; sql?: string }
): boolean {
  if (isExecutable(question)) {
    if (!answer.sql) return false;
    return gradeExecutable(question, dataset, answer.sql).correct;
  }
  return gradeChoice(question, answer.option);
}
