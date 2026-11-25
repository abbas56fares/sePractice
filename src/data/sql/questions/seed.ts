/**
 * Compact authoring shape for the SQL bank.
 *
 * Same idea as the Java bank's `seed.ts`: terse field names keep a 150-plus
 * question bank readable, and `choice()` / `write()` expand a seed into the
 * full `SqlQuestion` the app consumes. Ids get their level and topic prefix
 * here, so a topic file never repeats itself.
 */

import type { Difficulty, OptionId } from '../../../types';
import type {
  SqlChoiceQuestion,
  SqlDialect,
  SqlExecutableQuestion,
  SqlLevelId,
  SqlQuestion,
  SqlRejectedQuery,
} from '../../../types/sql';
import type { CompareOptions } from '../../../lib/sql';

const OPTION_IDS: OptionId[] = ['a', 'b', 'c', 'd'];

export interface ChoiceSeed {
  /** Suffix only — the topic prefix is added by `expandChoice`. */
  id: string;
  /** Question type. Defaults to `mcq`. */
  t?: SqlChoiceQuestion['type'];
  d: Difficulty;
  /** Short title for lists. */
  n: string;
  /** Prompt. */
  p: string;
  /** Optional SQL snippet shown above the options. */
  c?: string;
  o: Record<OptionId, string>;
  a: OptionId;
  /** Why each other option is wrong. */
  w: Partial<Record<OptionId, string>>;
  /** Why the keyed answer is right. */
  e: string;
  /** Progressive hints. */
  h?: string[];
  tags?: string[];
  /** Dataset override. */
  ds?: string;
  min?: number;
  dialect?: SqlDialect;
  /** Note about other engines. */
  dn?: string;
  /** Lets the verifier confirm the key by running SQL. */
  v?: { sql: string; expect: string; datasetId?: string };
}

export interface WriteSeed {
  id: string;
  /** `write` by default; `complete` when a starter with blanks is given. */
  t?: 'write' | 'complete';
  d: Difficulty;
  n: string;
  p: string;
  /** The reference solution — its result is the expected result. */
  sol: string;
  /** Pre-filled editor content. */
  starter?: string;
  /** Require this exact column order and naming. */
  cols?: string[];
  /** The question specifies an order, so row order is graded. */
  ordered?: boolean;
  /** Allow a legitimately empty result. */
  empty?: boolean;
  /** The exercise may modify its copy of the dataset. */
  rw?: boolean;
  h?: string[];
  e: string;
  tags?: string[];
  ds?: string;
  min?: number;
  dialect?: SqlDialect;
  dn?: string;
  /** Near-miss queries the verifier proves are genuinely wrong. */
  rejects?: SqlRejectedQuery[];
  /** Targeted advice when the learner's SQL matches a pattern. */
  mistakes?: { pattern: string; advice: string }[];
}

function trim(sql: string | undefined): string | undefined {
  return sql === undefined ? undefined : sql.trim();
}

export function expandChoice(
  levelId: SqlLevelId,
  topicId: string,
  prefix: string,
  seeds: ChoiceSeed[]
): SqlChoiceQuestion[] {
  return seeds.map((s) => ({
    id: `${prefix}-${s.id}`,
    levelId,
    topicId,
    type: s.t ?? 'mcq',
    difficulty: s.d,
    title: s.n,
    prompt: s.p,
    dialect: s.dialect ?? 'postgresql',
    ...(s.ds ? { datasetId: s.ds } : {}),
    ...(s.c ? { code: s.c.trim() } : {}),
    options: OPTION_IDS.map((id) => ({ id, text: s.o[id] })),
    answer: s.a,
    whyWrong: s.w,
    hints: s.h ?? [],
    explanation: s.e,
    estMinutes: s.min ?? 1,
    points: 1,
    tags: s.tags ?? [],
    ...(s.dn ? { dialectNote: s.dn } : {}),
    ...(s.v ? { verifyWith: s.v } : {}),
  }));
}

export function expandWrite(
  levelId: SqlLevelId,
  topicId: string,
  prefix: string,
  seeds: WriteSeed[]
): SqlExecutableQuestion[] {
  return seeds.map((s) => {
    const grading: Partial<CompareOptions> = {
      orderMatters: Boolean(s.ordered),
      checkColumnNames: Boolean(s.cols),
    };
    return {
      id: `${prefix}-${s.id}`,
      levelId,
      topicId,
      type: s.t ?? (s.starter ? 'complete' : 'write'),
      difficulty: s.d,
      title: s.n,
      prompt: s.p,
      dialect: s.dialect ?? 'postgresql',
      ...(s.ds ? { datasetId: s.ds } : {}),
      solution: s.sol.trim(),
      ...(s.starter ? { starter: trim(s.starter) } : {}),
      ...(s.rw ? { permission: 'read-write' as const } : {}),
      grading,
      ...(s.cols ? { expectedColumns: s.cols } : {}),
      ...(s.empty ? { allowEmptyResult: true } : {}),
      hints: s.h ?? [],
      explanation: s.e,
      estMinutes: s.min ?? 3,
      points: 2,
      tags: s.tags ?? [],
      ...(s.dn ? { dialectNote: s.dn } : {}),
      ...(s.rejects ? { rejects: s.rejects } : {}),
      ...(s.mistakes ? { commonMistakes: s.mistakes } : {}),
    };
  });
}

/** Builds one topic's questions from both seed kinds. */
export function topicQuestions(
  levelId: SqlLevelId,
  topicId: string,
  prefix: string,
  choices: ChoiceSeed[],
  writes: WriteSeed[] = []
): SqlQuestion[] {
  return [
    ...expandChoice(levelId, topicId, prefix, choices),
    ...expandWrite(levelId, topicId, prefix, writes),
  ];
}
