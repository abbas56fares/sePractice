/**
 * Structural audit of the SQL question bank.
 *
 * The counterpart of `validation.ts` for the Java bank: it catches the
 * failure modes that make a practice platform untrustworthy, before the
 * verifier goes on to execute every reference solution.
 */

import { OPTION_IDS } from '../types';
import type { SqlQuestion } from '../types/sql';
import { isChoice, isExecutable } from '../types/sql';
import { getSqlTopic } from '../data/sql/levels';
import { getDataset } from '../data/sql/datasets';

export interface SqlBankIssue {
  questionId: string;
  severity: 'error' | 'warning';
  message: string;
}

export function validateSqlBank(questions: readonly SqlQuestion[]): SqlBankIssue[] {
  const issues: SqlBankIssue[] = [];
  const seenIds = new Set<string>();
  const seenPrompts = new Map<string, string>();

  for (const q of questions) {
    const err = (message: string) => issues.push({ questionId: q.id, severity: 'error', message });
    const warn = (message: string) =>
      issues.push({ questionId: q.id, severity: 'warning', message });

    if (seenIds.has(q.id)) err('Duplicate question id');
    seenIds.add(q.id);

    const topic = getSqlTopic(q.topicId);
    if (!topic) err('Unknown topicId ' + q.topicId);
    else if (topic.levelId !== q.levelId) {
      err(`Level ${q.levelId} does not match topic ${topic.id} (level ${topic.levelId})`);
    }

    if (!q.title.trim()) err('Empty title');
    if (!q.prompt.trim()) err('Empty prompt');
    if (!q.explanation.trim()) err('Empty explanation');
    else if (q.explanation.trim().length < 40) warn('Explanation is very short');

    if (q.datasetId && !getDataset(q.datasetId)) err('Unknown datasetId ' + q.datasetId);

    if (q.tags.length === 0) warn('No tags — the question will not appear in tag-based practice');

    if (q.estMinutes <= 0) err('estMinutes must be positive');

    // A question is uniquely identified by what it asks plus what it shows.
    const fingerprint = q.prompt.trim() + ' :: ' + (q.code ?? '').trim();
    const twin = seenPrompts.get(fingerprint);
    if (twin) err('Same prompt and snippet as ' + twin);
    else seenPrompts.set(fingerprint, q.id);

    if (isChoice(q)) {
      if (q.options.length !== 4) err('Expected 4 options, found ' + q.options.length);

      const ids = q.options.map((o) => o.id);
      for (const id of OPTION_IDS) {
        if (!ids.includes(id)) err('Missing option ' + id);
      }

      const texts = new Set<string>();
      for (const o of q.options) {
        const text = o.text ? o.text.trim() : '';
        if (!text) err('Option ' + o.id + ' has no text');
        if (texts.has(text)) err('Option ' + o.id + ' duplicates the text of another option');
        texts.add(text);
      }

      if (!ids.includes(q.answer)) err('Answer ' + q.answer + ' is not one of the options');

      for (const o of q.options) {
        if (o.id === q.answer) continue;
        const why = q.whyWrong[o.id];
        if (!why || !why.trim()) err('No explanation for distractor ' + o.id);
      }

      // A rationale keyed to the correct answer means the key moved but the
      // explanations did not, which would show contradictory feedback.
      if (q.whyWrong[q.answer]) err('whyWrong has an entry for the correct option ' + q.answer);

      if ((q.type === 'predict' || q.type === 'error') && !q.code) {
        warn(`A ${q.type} question normally needs a SQL snippet`);
      }
    }

    if (isExecutable(q)) {
      if (!q.solution.trim()) err('Executable question has no solution');
      if (q.type === 'complete' && !q.starter) {
        err('A complete-the-query question needs a starter');
      }
      if (q.expectedColumns && q.expectedColumns.length === 0) {
        err('expectedColumns is declared but empty');
      }
      if (q.grading?.checkColumnNames && !q.expectedColumns) {
        err('checkColumnNames is set but expectedColumns is missing');
      }
      if (q.hints.length === 0 && q.difficulty !== 'easy') {
        warn('No hints on a non-easy executable exercise');
      }
    }
  }

  return issues;
}

export interface SqlBankSummary {
  total: number;
  byLevel: Record<number, number>;
  byType: Record<string, number>;
  executable: number;
  topicsCovered: number;
}

export function summariseSqlBank(questions: readonly SqlQuestion[]): SqlBankSummary {
  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const byType: Record<string, number> = {};
  const topics = new Set<string>();
  let executable = 0;

  for (const q of questions) {
    byLevel[q.levelId] = (byLevel[q.levelId] ?? 0) + 1;
    byType[q.type] = (byType[q.type] ?? 0) + 1;
    topics.add(q.topicId);
    if (isExecutable(q)) executable += 1;
  }

  return { total: questions.length, byLevel, byType, executable, topicsCovered: topics.size };
}
