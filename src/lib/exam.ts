import type { ActiveExam, Difficulty, ExamKind, ExamResult, LevelId, OptionId } from '../types';
import { questionsForLevel, questionsForTopic, getQuestion } from '../data/questions';
import { contentTopics } from '../data/levels';

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

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

/**
 * Chooses the questions for a level final.
 *
 * Takes them round-robin across the level's topics so every topic is
 * represented rather than whichever happens to sort first, then orders the
 * result easy-to-hard so the paper ramps up the way a real screening test does.
 */
function buildFinalExam(level: LevelId, count: number): string[] {
  const pools = contentTopics(level).map((t) => shuffled(questionsForTopic(t.id)));
  const picked: string[] = [];

  for (let round = 0; picked.length < count; round++) {
    let tookAny = false;
    for (const pool of pools) {
      if (picked.length >= count) break;
      const q = pool[round];
      if (q) {
        picked.push(q.id);
        tookAny = true;
      }
    }
    // Every pool exhausted: the level simply has fewer questions than asked for.
    if (!tookAny) break;
  }

  return sortByDifficulty(picked);
}

function sortByDifficulty(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const qa = getQuestion(a);
    const qb = getQuestion(b);
    if (!qa || !qb) return 0;
    return DIFFICULTY_ORDER[qa.difficulty] - DIFFICULTY_ORDER[qb.difficulty];
  });
}

export interface ExamRequest {
  level: LevelId;
  /** `null` builds a level final drawn from every topic in the level. */
  topicId: string | null;
  kind: ExamKind;
  questionCount: number;
  durationMinutes: number;
  shuffle: boolean;
}

/** How many questions a given exam configuration can actually serve. */
export function availableQuestionCount(level: LevelId, topicId: string | null): number {
  return topicId ? questionsForTopic(topicId).length : questionsForLevel(level).length;
}

export function createExam(req: ExamRequest): ActiveExam {
  const ids = req.topicId
    ? sortByDifficulty(
        (req.shuffle ? shuffled(questionsForTopic(req.topicId)) : questionsForTopic(req.topicId))
          .slice(0, req.questionCount)
          .map((q) => q.id)
      )
    : buildFinalExam(req.level, req.questionCount);

  const startedAt = Date.now();
  const durationMs = req.durationMinutes * 60_000;

  return {
    id: 'exam-' + startedAt.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    level: req.level,
    topicId: req.topicId,
    kind: req.kind,
    questionIds: ids,
    answers: {},
    flagged: [],
    startedAt,
    // Stored as an absolute instant, so a refresh or a route change cannot
    // restart the clock — remaining time is always derived from Date.now().
    deadline: startedAt + durationMs,
    durationMs,
    currentIndex: 0,
    timePerQuestion: {},
  };
}

export function remainingMs(exam: ActiveExam, now: number = Date.now()): number {
  return Math.max(0, exam.deadline - now);
}

export function isExpired(exam: ActiveExam, now: number = Date.now()): boolean {
  return now >= exam.deadline;
}

export interface ExamScore {
  score: number;
  total: number;
  pct: number;
  correctIds: string[];
  incorrectIds: string[];
  unansweredIds: string[];
}

export function scoreExam(
  questionIds: readonly string[],
  answers: Partial<Record<string, OptionId>>
): ExamScore {
  const correctIds: string[] = [];
  const incorrectIds: string[] = [];
  const unansweredIds: string[] = [];

  for (const id of questionIds) {
    const q = getQuestion(id);
    const given = answers[id];
    if (!q) continue;
    if (!given) unansweredIds.push(id);
    else if (given === q.answer) correctIds.push(id);
    else incorrectIds.push(id);
  }

  const total = questionIds.length;
  const score = correctIds.length;
  return {
    score,
    total,
    pct: total === 0 ? 0 : Math.round((score / total) * 100),
    correctIds,
    incorrectIds,
    unansweredIds,
  };
}

/** Freezes an active exam into a permanent history entry. */
export function finalizeExam(exam: ActiveExam, autoSubmitted: boolean, now = Date.now()): ExamResult {
  const { score, total, pct } = scoreExam(exam.questionIds, exam.answers);
  const submittedAt = Math.min(now, exam.deadline);
  return {
    id: exam.id,
    level: exam.level,
    topicId: exam.topicId,
    kind: exam.kind,
    questionIds: exam.questionIds,
    answers: exam.answers,
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
  };
}

export interface TopicBreakdownRow {
  topicId: string;
  correct: number;
  total: number;
  pct: number;
}

export function examTopicBreakdown(result: ExamResult): TopicBreakdownRow[] {
  const rows = new Map<string, { correct: number; total: number }>();
  for (const id of result.questionIds) {
    const q = getQuestion(id);
    if (!q) continue;
    const row = rows.get(q.topicId) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (result.answers[id] === q.answer) row.correct += 1;
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
