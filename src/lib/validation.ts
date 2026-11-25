import type { Question } from '../types';
import { OPTION_IDS } from '../types';
import { TOPIC_BY_ID } from '../data/levels';

export interface BankIssue {
  questionId: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Structural audit of the question bank. Catches the failure modes that make a
 * practice platform untrustworthy: duplicate ids, a missing or impossible
 * answer key, fewer than four options, two options with identical text, an
 * unexplained distractor, or a question attached to a topic that does not exist.
 *
 * Whether a snippet really produces the keyed output is a separate concern,
 * checked against a real JDK by `npm run verify:java`.
 */
export function validateBank(questions: readonly Question[]): BankIssue[] {
  const issues: BankIssue[] = [];
  const seenIds = new Set<string>();
  const seenPrompts = new Map<string, string>();

  for (const q of questions) {
    const err = (message: string) => issues.push({ questionId: q.id, severity: 'error', message });
    const warn = (message: string) =>
      issues.push({ questionId: q.id, severity: 'warning', message });

    if (seenIds.has(q.id)) err('Duplicate question id');
    seenIds.add(q.id);

    const topic = TOPIC_BY_ID.get(q.topicId);
    if (!topic) err('Unknown topicId ' + q.topicId);
    else if (topic.level !== q.level) err('Level ' + q.level + ' does not match topic ' + topic.id);
    else if (topic.isFinal) err('Questions must not be attached to a final-exam topic');

    if (!q.prompt.trim()) err('Empty prompt');

    if (q.options.length !== 4) err('Expected 4 options, found ' + q.options.length);

    const ids = q.options.map((o) => o.id);
    for (const id of OPTION_IDS) {
      if (!ids.includes(id)) err('Missing option ' + id);
    }

    const texts = new Set<string>();
    for (const o of q.options) {
      const text = o.text ? o.text.trim() : '';
      if (!text) err('Option ' + o.id + ' has no text');
      // Compared case-sensitively on purpose: "hello" and "HELLO" are
      // genuinely different options in a bank full of case questions.
      if (texts.has(text)) err('Option ' + o.id + ' duplicates the text of another option');
      texts.add(text);
    }

    if (!ids.includes(q.answer)) err('Answer ' + q.answer + ' is not one of the options');

    if (!q.explanation.trim()) err('Empty explanation');
    else if (q.explanation.trim().length < 40) warn('Explanation is very short');

    for (const o of q.options) {
      if (o.id === q.answer) continue;
      const why = q.whyWrong[o.id];
      if (!why || !why.trim()) err('No explanation for distractor ' + o.id);
    }

    // A rationale keyed to the correct answer means the key moved but the
    // explanations did not, which would show the learner contradictory feedback.
    if (q.whyWrong[q.answer]) err('whyWrong has an entry for the correct option ' + q.answer);

    if ((q.kind === 'output' || q.kind === 'bug' || q.kind === 'compile') && !q.code) {
      warn('Kind ' + q.kind + ' normally needs a code snippet');
    }

    const fingerprint = q.prompt + ' :: ' + (q.code ?? '');
    const twin = seenPrompts.get(fingerprint);
    if (twin) err('Same prompt and snippet as ' + twin);
    else seenPrompts.set(fingerprint, q.id);
  }

  return issues;
}
