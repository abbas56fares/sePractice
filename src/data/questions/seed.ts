import type {
  CodeLang,
  Difficulty,
  LevelId,
  OptionId,
  Question,
  QuestionKind,
  VerifySpec,
} from '../../types';

/**
 * Compact authoring shape for the question bank. Keeping it terse keeps the
 * bank readable; `expand()` turns it into the full `Question` the app consumes.
 *
 *   id   suffix only — the level/topic prefix is added by `expand`
 *   d    difficulty          k   question kind
 *   p    prompt              c   code snippet       lang  snippet language
 *   o    the four options    a   correct option id
 *   e    why `a` is correct  w   why each other option is wrong
 *   h    hint                v   JDK verification spec
 */
export interface Seed {
  id: string;
  d: Difficulty;
  k: QuestionKind;
  p: string;
  c?: string;
  lang?: CodeLang;
  o: Record<OptionId, string>;
  a: OptionId;
  e: string;
  w: Partial<Record<OptionId, string>>;
  h?: string;
  v?: VerifySpec;
}

export function expand(level: LevelId, topicId: string, prefix: string, seeds: Seed[]): Question[] {
  return seeds.map((s) => ({
    id: `${prefix}-${s.id}`,
    level,
    topicId,
    difficulty: s.d,
    kind: s.k,
    prompt: s.p,
    ...(s.c ? { code: s.c.trim(), codeLang: s.lang ?? ('java' as CodeLang) } : {}),
    options: (['a', 'b', 'c', 'd'] as OptionId[]).map((id) => ({ id, text: s.o[id] })),
    answer: s.a,
    explanation: s.e,
    whyWrong: s.w,
    ...(s.h ? { hint: s.h } : {}),
    ...(s.v ? { verify: s.v } : {}),
  }));
}

export const JAVA_OUT: VerifySpec = { mode: 'stdout' };
export const COMPILE_ERR: VerifySpec = { mode: 'compile-error' };
export function out(expect: string): VerifySpec {
  return { mode: 'stdout', expect };
}
export function throws(type: string): VerifySpec {
  return { mode: 'runtime-throws', expect: type };
}
