/**
 * SQL exam engine.
 *
 * Mirrors the Java engine's design decisions deliberately: the clock derives
 * from a persisted absolute deadline rather than an accumulated counter, so a
 * refresh, a navigation or a closed tab cannot reset it, and an exam that
 * expired while the tab was shut auto-submits on the next render.
 *
 * What it adds is a third exam kind (mock), papers that span levels, and
 * grading that has to execute the learner's SQL rather than compare an id.
 */
import type { OptionId, Settings } from '../types';
import type {
  SqlActiveExam,
  SqlExamConfig,
  SqlExamResult,
  SqlLevelId,
  SqlQuestion,
  SqlTopic,
} from '../types/sql';
import { isExecutable } from '../types/sql';
import {
  getSqlDatasetFor,
  getSqlQuestion,
  getSqlQuestions,
  sqlQuestionsForLevel,
  sqlQuestionsForTopic,
} from '../data/sql/questions';
import { sqlTopicsForLevel } from '../data/sql/levels';
import { gradeAnswer } from './sql-grading';

function shuffled<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i] as T;
    a[i] = a[j] as T;
    a[j] = ai;
  }
  return a;
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

function rampByDifficulty(questions: SqlQuestion[]): SqlQuestion[] {
  return [...questions].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  );
}

/**
 * Picks `count` questions, spreading them round-robin across the topics so
 * every topic is represented, and honouring the configured share of
 * executable exercises before filling the rest with choice questions.
 */
function selectQuestions(pool: SqlQuestion[], count: number, executableShare: number): SqlQuestion[] {
  const wantExecutable = Math.min(
    Math.round(count * executableShare),
    pool.filter(isExecutable).length
  );
  const byTopic = new Map<string, SqlQuestion[]>();
  for (const q of pool) {
    const bucket = byTopic.get(q.topicId);
    if (bucket) bucket.push(q);
    else byTopic.set(q.topicId, [q]);
  }
  const pickRoundRobin = (predicate: (q: SqlQuestion) => boolean, limit: number): SqlQuestion[] => {
    const queues = [...byTopic.values()].map((qs) => shuffled(qs.filter(predicate)));
    const picked: SqlQuestion[] = [];
    for (let round = 0; picked.length < limit; round++) {
      let tookAny = false;
      for (const queue of queues) {
        if (picked.length >= limit) break;
        const q = queue[round];
        if (q) {
          picked.push(q);
          tookAny = true;
        }
      }
      if (!tookAny) break;
    }
    return picked;
  };
  const executables = pickRoundRobin(isExecutable, wantExecutable);
  const chosen = new Set(executables.map((q) => q.id));
  const choices = pickRoundRobin((q) => !isExecutable(q) && !chosen.has(q.id), count - executables.length);
  let combined = [...executables, ...choices];
  // If one kind ran out, top up from whatever is left rather than serving a
  // short paper.
  if (combined.length < count) {
    const used = new Set(combined.map((q) => q.id));
    const filler = shuffled(pool.filter((q) => !used.has(q.id))).slice(0, count - combined.length);
    combined = [...combined, ...filler];
  }
  return rampByDifficulty(combined);
}

/** The pool a configuration draws from, honouring any level mix. */
export function poolForConfig(config: SqlExamConfig): SqlQuestion[] {
  if (config.topicId) return sqlQuestionsForTopic(config.topicId);
  if (config.levelId) return sqlQuestionsForLevel(config.levelId);
  return [1, 2, 3].flatMap((l) => sqlQuestionsForLevel(l as SqlLevelId));
}

/** How many questions a configuration can actually serve. */
export function availableForConfig(config: SqlExamConfig): number {
  if (!config.levelMix) return Math.min(config.questionCount, poolForConfig(config).length);
  let total = 0;
  for (const [level, want] of Object.entries(config.levelMix)) {
    total += Math.min(want ?? 0, sqlQuestionsForLevel(Number(level) as SqlLevelId).length);
  }
  return Math.min(config.questionCount, total);
}

export function buildSqlExam(config: SqlExamConfig): SqlActiveExam {
  const share = config.executableShare ?? 0.3;
  let selected: SqlQuestion[];
  if (config.levelMix) {
    // A mixed paper takes a fixed number from each level, then ramps the
    // whole thing by difficulty so it reads as one exam rather than three.
    selected = rampByDifficulty(
      (Object.entries(config.levelMix) as [string, number][]).flatMap(([level, want]) =>
        selectQuestions(sqlQuestionsForLevel(Number(level) as SqlLevelId), want, share)
      )
    );
  } else {
    selected = selectQuestions(poolForConfig(config), config.questionCount, share);
  }
  const startedAt = Date.now();
  const durationMs = config.durationMinutes * 60_000;
  return {
    id: 'sqlexam-' + startedAt.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    configId: config.id,
    kind: config.kind,
    levelId: config.levelId,
    topicId: config.topicId,
    questionIds: selected.map((q) => q.id),
    answers: {},
    queries: {},
    flagged: [],
    startedAt,
    // Absolute instant, so remaining time is always derived from Date.now().
    deadline: startedAt + durationMs,
    durationMs,
    currentIndex: 0,
    timePerQuestion: {},
  };
}

/** A topic exam, built from the topic and the user's settings. */
export function topicExamConfig(topic: SqlTopic, settings: Settings): SqlExamConfig {
  const available = sqlQuestionsForTopic(topic.id).length;
  return {
    id: 'sql-topic-' + topic.id,
    kind: 'topic',
    name: topic.name + ' exam',
    description: `A timed exam drawn from ${topic.name}.`,
    levelId: topic.levelId,
    topicId: topic.id,
    questionCount: Math.min(settings.sqlTopicExamQuestions, available),
    durationMinutes: settings.sqlTopicExamMinutes,
    passPct: settings.passThresholdPct,
    executableShare: 0.3,
  };
}

export function sqlRemainingMs(exam: SqlActiveExam, now: number = Date.now()): number {
  return Math.max(0, exam.deadline - now);
}

export function sqlIsExpired(exam: SqlActiveExam, now: number = Date.now()): boolean {
  return now >= exam.deadline;
}

export interface SqlExamScore {
  score: number;
  total: number;
  pct: number;
  correct: Record<string, boolean>;
  correctIds: string[];
  incorrectIds: string[];
  unansweredIds: string[];
}

/**
 * Scores a paper. Executable answers are re-run here, at submission time, so
 * the recorded result does not depend on whether the learner happened to
 * press Run — and so the stored outcome is a fact rather than a cached guess.
 */
export function scoreSqlExam(
  questionIds: readonly string[],
  answers: Partial<Record<string, OptionId>>,
  queries: Partial<Record<string, string>>
): SqlExamScore {
  const correct: Record<string, boolean> = {};
  const correctIds: string[] = [];
  const incorrectIds: string[] = [];
  const unansweredIds: string[] = [];
  for (const id of questionIds) {
    const q = getSqlQuestion(id);
    if (!q) continue;
    const given = isExecutable(q) ? queries[id] : answers[id];
    if (!given) {
      unansweredIds.push(id);
      correct[id] = false;
      continue;
    }
    const ok = gradeAnswer(q, getSqlDatasetFor(q), {
      option: answers[id],
      ...(queries[id] !== undefined ? { sql: queries[id] as string } : {}),
    });
    correct[id] = ok;
    if (ok) correctIds.push(id);
    else incorrectIds.push(id);
  }
  const total = questionIds.length;
  const score = correctIds.length;
  return {
    score,
    total,
    pct: total === 0 ? 0 : Math.round((score / total) * 100),
    correct,
    correctIds,
    incorrectIds,
    unansweredIds,
  };
}

export function finalizeSqlExam(
  exam: SqlActiveExam,
  passPct: number,
  autoSubmitted: boolean,
  now = Date.now()
): SqlExamResult {
  const { score, total, pct, correct } = scoreSqlExam(exam.questionIds, exam.answers, exam.queries);
  const submittedAt = Math.min(now, exam.deadline);
  return {
    id: exam.id,
    configId: exam.configId,
    kind: exam.kind,
    levelId: exam.levelId,
    topicId: exam.topicId,
    questionIds: exam.questionIds,
    answers: exam.answers,
    queries: exam.queries,
    correct,
    flagged: exam.flagged,
    timePerQuestion: exam.timePerQuestion,
    startedAt: exam.startedAt,
    submittedAt,
    elapsedMs: Math.min(submittedAt - exam.startedAt, exam.durationMs),
    allowedMs: exam.durationMs,
    autoSubmitted,
    score,
    total,
    pct,
    passPct,
  };
}

export interface SqlTopicBreakdownRow {
  topicId: string;
  correct: number;
  total: number;
  pct: number;
}

export function sqlExamTopicBreakdown(result: SqlExamResult): SqlTopicBreakdownRow[] {
  const rows = new Map<string, { correct: number; total: number }>();
  for (const id of result.questionIds) {
    const q = getSqlQuestion(id);
    if (!q) continue;
    const row = rows.get(q.topicId) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (result.correct[id]) row.correct += 1;
    rows.set(q.topicId, row);
  }
  return [...rows.entries()]
    .map(([topicId, r]) => ({
      topicId,
      correct: r.correct,
      total: r.total,
      pct: r.total === 0 ? 0 : Math.round((r.correct / r.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);
}

/** Topics worth revising after a paper: anything below the pass mark. */
export function revisionTopics(result: SqlExamResult): SqlTopicBreakdownRow[] {
  return sqlExamTopicBreakdown(result).filter((r) => r.pct < result.passPct);
}

export { getSqlQuestions, sqlTopicsForLevel };
