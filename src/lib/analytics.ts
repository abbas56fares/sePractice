import type { AppData, Question } from '../types';
import { QUESTIONS, getQuestion } from '../data/questions';
import { TOPIC_BY_ID } from '../data/levels';

export interface OverallStats {
  questionsTotal: number;
  questionsAttempted: number;
  questionsRemaining: number;
  /** Correct on the most recent attempt, as a share of attempted. */
  accuracyPct: number;
  /** Mean exam percentage across all exams taken. */
  averageExamPct: number;
  examsTaken: number;
  totalTimeMs: number;
  flaggedCount: number;
  mistakeCount: number;
  bestExamPct: number;
}

export function overallStats(data: AppData): OverallStats {
  let attempted = 0;
  let correct = 0;
  let totalTimeMs = 0;
  let mistakes = 0;

  for (const q of QUESTIONS) {
    const stat = data.questionStats[q.id];
    if (!stat || stat.attempts === 0) continue;
    attempted += 1;
    totalTimeMs += stat.totalMs;
    if (stat.lastCorrect) correct += 1;
    else mistakes += 1;
  }

  const exams = data.examResults;
  const examSum = exams.reduce((n, r) => n + r.pct, 0);

  return {
    questionsTotal: QUESTIONS.length,
    questionsAttempted: attempted,
    questionsRemaining: QUESTIONS.length - attempted,
    accuracyPct: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    averageExamPct: exams.length === 0 ? 0 : Math.round(examSum / exams.length),
    examsTaken: exams.length,
    totalTimeMs,
    flaggedCount: data.flagged.length,
    mistakeCount: mistakes,
    bestExamPct: exams.reduce((n, r) => Math.max(n, r.pct), 0),
  };
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  level: number;
  attempted: number;
  questionCount: number;
  correct: number;
  accuracyPct: number;
  avgMsPerQuestion: number;
}

export function topicPerformance(data: AppData): TopicPerformance[] {
  const rows = new Map<string, { attempted: number; correct: number; ms: number; total: number }>();

  for (const q of QUESTIONS) {
    const row = rows.get(q.topicId) ?? { attempted: 0, correct: 0, ms: 0, total: 0 };
    row.total += 1;
    const stat = data.questionStats[q.id];
    if (stat && stat.attempts > 0) {
      row.attempted += 1;
      row.ms += stat.totalMs;
      if (stat.lastCorrect) row.correct += 1;
    }
    rows.set(q.topicId, row);
  }

  return [...rows.entries()].map(([topicId, r]) => {
    const topic = TOPIC_BY_ID.get(topicId);
    return {
      topicId,
      topicName: topic?.name ?? topicId,
      level: topic?.level ?? 0,
      attempted: r.attempted,
      questionCount: r.total,
      correct: r.correct,
      accuracyPct: r.attempted === 0 ? 0 : Math.round((r.correct / r.attempted) * 100),
      avgMsPerQuestion: r.attempted === 0 ? 0 : Math.round(r.ms / r.attempted),
    };
  });
}

/**
 * Topics worth revisiting: lowest accuracy first, but only where enough
 * questions have been attempted for the number to mean anything.
 */
export function weakestTopics(data: AppData, limit = 4, minAttempts = 3): TopicPerformance[] {
  return topicPerformance(data)
    .filter((t) => t.attempted >= minAttempts && t.accuracyPct < 100)
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.attempted - a.attempted)
    .slice(0, limit);
}

/** Questions answered incorrectly on their most recent attempt. */
export function mistakeQuestions(data: AppData): Question[] {
  return QUESTIONS.filter((q) => {
    const stat = data.questionStats[q.id];
    return Boolean(stat && stat.attempts > 0 && !stat.lastCorrect);
  });
}

export function flaggedQuestions(data: AppData): Question[] {
  return data.flagged
    .map((id) => getQuestion(id))
    .filter((q): q is Question => Boolean(q));
}

export interface ExamTrendPoint {
  index: number;
  pct: number;
  at: number;
  level: number;
  kind: string;
}

/** Exam scores oldest-first, for the improvement chart. */
export function examTrend(data: AppData): ExamTrendPoint[] {
  return [...data.examResults]
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map((r, index) => ({
      index,
      pct: r.pct,
      at: r.submittedAt,
      level: r.level,
      kind: r.kind,
    }));
}

export interface DailyActivity {
  date: string;
  answered: number;
  correct: number;
}

/** Practice volume per day over the trailing `days` window. */
export function dailyActivity(data: AppData, days = 14): DailyActivity[] {
  const out: DailyActivity[] = [];
  const byDay = new Map<string, { answered: number; correct: number }>();

  for (const e of data.practiceLog) {
    const key = new Date(e.at).toISOString().slice(0, 10);
    const row = byDay.get(key) ?? { answered: 0, correct: 0 };
    row.answered += 1;
    if (e.correct) row.correct += 1;
    byDay.set(key, row);
  }

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    out.push({ date: key, answered: row?.answered ?? 0, correct: row?.correct ?? 0 });
  }
  return out;
}

export interface Recommendation {
  title: string;
  body: string;
  to: string;
  actionLabel: string;
}

/** What to do next, derived from actual performance rather than a fixed order. */
export function recommendations(data: AppData): Recommendation[] {
  const out: Recommendation[] = [];
  const stats = overallStats(data);

  if (stats.mistakeCount > 0) {
    out.push({
      title: `${stats.mistakeCount} question${stats.mistakeCount === 1 ? '' : 's'} to re-attempt`,
      body: 'These are the questions you answered incorrectly most recently. Re-doing them is the fastest way to raise your accuracy.',
      to: '/review',
      actionLabel: 'Review mistakes',
    });
  }

  for (const topic of weakestTopics(data, 2)) {
    out.push({
      title: `${topic.topicName} is at ${topic.accuracyPct}%`,
      body: `You have attempted ${topic.attempted} of ${topic.questionCount} questions here. This is your weakest area with enough data to judge.`,
      to: `/practice/${topic.topicId}`,
      actionLabel: 'Practise this topic',
    });
  }

  if (stats.flaggedCount > 0) {
    out.push({
      title: `${stats.flaggedCount} flagged question${stats.flaggedCount === 1 ? '' : 's'}`,
      body: 'Questions you marked as difficult while practising. Clear the backlog while the reasoning is still fresh.',
      to: '/review?filter=flagged',
      actionLabel: 'Practise flagged',
    });
  }

  if (out.length === 0) {
    out.push({
      title: 'Nothing flagged and nothing wrong',
      body: 'Either you are just starting out or you are on top of everything attempted so far. Pick a topic from the roadmap and keep going.',
      to: '/roadmap',
      actionLabel: 'Open the roadmap',
    });
  }

  return out;
}
