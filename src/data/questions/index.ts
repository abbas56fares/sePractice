import type { LevelId, Question } from '../../types';
import { l1Basics } from './l1-basics';
import { l1Control } from './l1-control';
import { l1Arrays } from './l1-arrays';
import { l1Methods } from './l1-methods';
import { l1Classes } from './l1-classes';
import { l1Ctor } from './l1-ctor';
import { l1Algo } from './l1-algo';
import { l2Inherit } from './l2-inherit';
import { l2Override } from './l2-override';
import { l2Abstract } from './l2-abstract';
import { l2Poly } from './l2-poly';
import { l2Init } from './l2-init';
import { l2Modifiers } from './l2-modifiers';
import { l2Exceptions } from './l2-exceptions';
import { l3Tracing } from './l3-tracing';
import { l3Generics } from './l3-generics';
import { l3Equality } from './l3-equality';
import { l3Recursion } from './l3-recursion';
import { l3Ds } from './l3-ds';
import { l3Debug } from './l3-debug';
import { l3Screening } from './l3-screening';

/**
 * The whole question bank, flattened. One module per roadmap topic feeds in
 * here; see the README section "Adding new questions".
 */
export const QUESTIONS: Question[] = [
  ...l1Basics,
  ...l1Control,
  ...l1Arrays,
  ...l1Methods,
  ...l1Classes,
  ...l1Ctor,
  ...l1Algo,
  ...l2Inherit,
  ...l2Override,
  ...l2Abstract,
  ...l2Poly,
  ...l2Init,
  ...l2Modifiers,
  ...l2Exceptions,
  ...l3Tracing,
  ...l3Generics,
  ...l3Equality,
  ...l3Recursion,
  ...l3Ds,
  ...l3Debug,
  ...l3Screening,
];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return QUESTION_BY_ID.get(id);
}

export function getQuestions(ids: readonly string[]): Question[] {
  return ids.map((id) => QUESTION_BY_ID.get(id)).filter((q): q is Question => Boolean(q));
}

const byTopic = new Map<string, Question[]>();
const byLevel = new Map<LevelId, Question[]>();
for (const q of QUESTIONS) {
  const t = byTopic.get(q.topicId);
  if (t) t.push(q);
  else byTopic.set(q.topicId, [q]);
  const l = byLevel.get(q.level);
  if (l) l.push(q);
  else byLevel.set(q.level, [q]);
}

export function questionsForTopic(topicId: string): Question[] {
  return byTopic.get(topicId) ?? [];
}

export function questionsForLevel(level: LevelId): Question[] {
  return byLevel.get(level) ?? [];
}
