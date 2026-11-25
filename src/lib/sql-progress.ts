/**
 * SQL progress, status and analytics.
 *
 * Reads only `data.sql`, so nothing here can affect the Java major's
 * accounting, and nothing there can affect this. Unlocking follows the same
 * rule the Java roadmap uses: a level's final exam opens on the *average* of
 * its topic-exam scores, not on a pass in every topic.
 */

import type { AppData, Difficulty, TopicStatus } from '../types';
import type { SqlExamResult, SqlLevelId, SqlQuestion, SqlTopic } from '../types/sql';
import { isExecutable } from '../types/sql';
import { SQL_LEVELS, sqlTopicsForLevel } from '../data/sql/levels';
import {
  SQL_QUESTIONS,
  getSqlQuestion,
  sqlQuestionsForLevel,
  sqlQuestionsForTopic,
} from '../data/sql/questions';
import { finalExamForLevel } from '../data/sql/exams';
import type { ExamTrendPoint } from './analytics';

/* -------------------------------------------------------------- per topic */

export interface SqlTopicProgress {
  topic: SqlTopic;
  status: TopicStatus;
  attempted: number;
  questionCount: number;
  completionPct: number;
  accuracyPct: number;
  /** Best topic-exam score, 0-100. */
  bestScorePct: number;
  attemptCount: number;
  practiceMs: number;
  lessonRead: boolean;
  lockReason?: string;
}

function bestTopicExam(data: AppData, topicId: string): number {
  let best = 0;
  for (const r of data.sql.examResults) {
    if (r.kind !== 'topic' || r.topicId !== topicId) continue;
    if (r.pct > best) best = r.pct;
  }
  return best;
}

export function sqlTopicExamCount(data: AppData, topicId: string): number {
  return data.sql.examResults.filter((r) => r.kind === 'topic' && r.topicId === topicId).length;
}

/** Best score on a named mock test or final exam. */
export function bestConfigScore(data: AppData, configId: string): number {
  let best = 0;
  for (const r of data.sql.examResults) {
    if (r.configId === configId && r.pct > best) best = r.pct;
  }
  return best;
}

export function configAttempts(data: AppData, configId: string): number {
  return data.sql.examResults.filter((r) => r.configId === configId).length;
}

export function isSqlLevelUnlocked(data: AppData, levelId: SqlLevelId): boolean {
  if (levelId === 1 || data.settings.unlockMode === 'open') return true;
  const previousFinal = finalExamForLevel(levelId - 1);
  if (!previousFinal) return true;
  return bestConfigScore(data, previousFinal.id) >= data.settings.passThresholdPct;
}

/**
 * Average of the best topic-exam scores across a level's topics. Topics never
 * sat count as 0, so the average only reaches the threshold once enough of
 * the level has actually been examined.
 */
export function sqlLevelTopicAveragePct(data: AppData, levelId: SqlLevelId): number {
  const topics = sqlTopicsForLevel(levelId);
  if (topics.length === 0) return 0;
  const total = topics.reduce((n, t) => n + bestTopicExam(data, t.id), 0);
  return Math.round(total / topics.length);
}

/** A level's final exam opens on the average of its topic exams. */
export function isSqlFinalUnlocked(data: AppData, levelId: SqlLevelId): boolean {
  if (data.settings.unlockMode === 'open') return true;
  if (!isSqlLevelUnlocked(data, levelId)) return false;
  return sqlLevelTopicAveragePct(data, levelId) >= data.settings.passThresholdPct;
}

export function sqlTopicProgress(data: AppData, topic: SqlTopic): SqlTopicProgress {
  const questions = sqlQuestionsForTopic(topic.id);
  const questionCount = questions.length;

  let attempted = 0;
  let correctLast = 0;
  let practiceMs = 0;
  for (const q of questions) {
    const stat = data.sql.questionStats[q.id];
    if (!stat || stat.attempts === 0) continue;
    attempted += 1;
    if (stat.lastCorrect) correctLast += 1;
    practiceMs += stat.totalMs;
  }

  const best = bestTopicExam(data, topic.id);
  const attempts = sqlTopicExamCount(data, topic.id);
  const threshold = data.settings.passThresholdPct;
  const unlocked = isSqlLevelUnlocked(data, topic.levelId);

  let status: TopicStatus;
  let lockReason: string | undefined;
  if (!unlocked) {
    status = 'locked';
    lockReason = `Score ${threshold}% or more on the SQL Level ${topic.levelId - 1} final exam to unlock Level ${topic.levelId}.`;
  } else if (best >= threshold) {
    status = 'completed';
  } else if (attempted > 0 || attempts > 0) {
    status = 'in-progress';
  } else {
    status = 'available';
  }

  return {
    topic,
    status,
    attempted,
    questionCount,
    completionPct: questionCount === 0 ? 0 : Math.round((attempted / questionCount) * 100),
    accuracyPct: attempted === 0 ? 0 : Math.round((correctLast / attempted) * 100),
    bestScorePct: best,
    attemptCount: attempts,
    practiceMs,
    lessonRead: data.sql.lessonsRead.includes(topic.id),
    ...(lockReason ? { lockReason } : {}),
  };
}

/* -------------------------------------------------------------- per level */

export interface SqlLevelProgress {
  levelId: SqlLevelId;
  name: string;
  tagline: string;
  description: string;
  unlocked: boolean;
  topics: SqlTopicProgress[];
  questionCount: number;
  attempted: number;
  topicsCompleted: number;
  topicsTotal: number;
  completionPct: number;
  accuracyPct: number;
  finalBestPct: number;
  finalUnlocked: boolean;
  lessonsRead: number;
  exercisesAvailable: number;
}

export function sqlLevelProgress(data: AppData, levelId: SqlLevelId): SqlLevelProgress {
  const def = SQL_LEVELS.find((l) => l.id === levelId);
  const topics = (def?.topics ?? []).map((t) => sqlTopicProgress(data, t));

  const questionCount = topics.reduce((n, t) => n + t.questionCount, 0);
  const attempted = topics.reduce((n, t) => n + t.attempted, 0);
  const weightedAccuracy = topics.reduce((n, t) => n + (t.accuracyPct * t.attempted) / 100, 0);
  const final = finalExamForLevel(levelId);

  return {
    levelId,
    name: def?.name ?? '',
    tagline: def?.tagline ?? '',
    description: def?.description ?? '',
    unlocked: isSqlLevelUnlocked(data, levelId),
    topics,
    questionCount,
    attempted,
    topicsCompleted: topics.filter((t) => t.status === 'completed').length,
    topicsTotal: topics.length,
    completionPct: questionCount === 0 ? 0 : Math.round((attempted / questionCount) * 100),
    accuracyPct: attempted === 0 ? 0 : Math.round((weightedAccuracy / attempted) * 100),
    finalBestPct: final ? bestConfigScore(data, final.id) : 0,
    finalUnlocked: isSqlFinalUnlocked(data, levelId),
    lessonsRead: topics.filter((t) => t.lessonRead).length,
    exercisesAvailable: sqlQuestionsForLevel(levelId).filter(isExecutable).length,
  };
}

export function allSqlLevelProgress(data: AppData): SqlLevelProgress[] {
  return SQL_LEVELS.map((l) => sqlLevelProgress(data, l.id));
}

/* ---------------------------------------------------------- overall stats */

export interface SqlOverallStats {
  topicsTotal: number;
  questionsTotal: number;
  questionsAttempted: number;
  questionsRemaining: number;
  exercisesTotal: number;
  exercisesCompleted: number;
  accuracyPct: number;
  /** Mean of the per-question accuracy across attempted exercises. */
  exerciseAvgPct: number;
  mocksCompleted: number;
  finalsCompleted: number;
  bestScorePct: number;
  totalTimeMs: number;
  flaggedCount: number;
  mistakeCount: number;
  lessonsRead: number;
}

export function sqlOverallStats(data: AppData): SqlOverallStats {
  let attempted = 0;
  let correct = 0;
  let totalTimeMs = 0;
  let mistakes = 0;
  let exercisesCompleted = 0;
  let exercisesAttempted = 0;
  let exerciseCorrect = 0;

  for (const q of SQL_QUESTIONS) {
    const stat = data.sql.questionStats[q.id];
    if (!stat || stat.attempts === 0) continue;
    attempted += 1;
    totalTimeMs += stat.totalMs;
    if (stat.lastCorrect) correct += 1;
    else mistakes += 1;

    if (isExecutable(q)) {
      exercisesAttempted += 1;
      if (stat.lastCorrect) {
        exercisesCompleted += 1;
        exerciseCorrect += 1;
      }
    }
  }

  const results = data.sql.examResults;

  return {
    topicsTotal: SQL_LEVELS.reduce((n, l) => n + l.topics.length, 0),
    questionsTotal: SQL_QUESTIONS.length,
    questionsAttempted: attempted,
    questionsRemaining: SQL_QUESTIONS.length - attempted,
    exercisesTotal: SQL_QUESTIONS.filter(isExecutable).length,
    exercisesCompleted,
    accuracyPct: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    exerciseAvgPct:
      exercisesAttempted === 0 ? 0 : Math.round((exerciseCorrect / exercisesAttempted) * 100),
    mocksCompleted: results.filter((r) => r.kind === 'mock').length,
    finalsCompleted: results.filter((r) => r.kind === 'final').length,
    bestScorePct: results.reduce((n, r) => Math.max(n, r.pct), 0),
    totalTimeMs,
    flaggedCount: data.sql.flagged.length,
    mistakeCount: mistakes,
    lessonsRead: data.sql.lessonsRead.length,
  };
}

/* -------------------------------------------------------------- revision */

export interface SqlTopicPerformance {
  topicId: string;
  topicName: string;
  levelId: SqlLevelId;
  difficulty: Difficulty;
  attempted: number;
  questionCount: number;
  correct: number;
  accuracyPct: number;
}

export function sqlTopicPerformance(data: AppData): SqlTopicPerformance[] {
  return SQL_LEVELS.flatMap((level) =>
    level.topics.map((topic) => {
      const questions = sqlQuestionsForTopic(topic.id);
      let attempted = 0;
      let correct = 0;
      for (const q of questions) {
        const stat = data.sql.questionStats[q.id];
        if (!stat || stat.attempts === 0) continue;
        attempted += 1;
        if (stat.lastCorrect) correct += 1;
      }
      return {
        topicId: topic.id,
        topicName: topic.name,
        levelId: topic.levelId,
        difficulty: topic.difficulty,
        attempted,
        questionCount: questions.length,
        correct,
        accuracyPct: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
      };
    })
  );
}

/** Topics worth revisiting: lowest accuracy first, with enough data to judge. */
export function sqlWeakestTopics(data: AppData, limit = 4, minAttempts = 3): SqlTopicPerformance[] {
  return sqlTopicPerformance(data)
    .filter((t) => t.attempted >= minAttempts && t.accuracyPct < 100)
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.attempted - a.attempted)
    .slice(0, limit);
}

/** Questions answered incorrectly on their most recent attempt. */
export function sqlMistakeQuestions(data: AppData): SqlQuestion[] {
  return SQL_QUESTIONS.filter((q) => {
    const stat = data.sql.questionStats[q.id];
    return Boolean(stat && stat.attempts > 0 && !stat.lastCorrect);
  });
}

/** Questions wrong on two or more attempts — the persistent trouble spots. */
export function sqlRepeatedMistakes(data: AppData): SqlQuestion[] {
  return SQL_QUESTIONS.filter((q) => {
    const stat = data.sql.questionStats[q.id];
    if (!stat || stat.attempts < 2) return false;
    return stat.attempts - stat.correct >= 2;
  });
}

export function sqlFlaggedQuestions(data: AppData): SqlQuestion[] {
  return data.sql.flagged
    .map((id) => getSqlQuestion(id))
    .filter((q): q is SqlQuestion => Boolean(q));
}

/* ------------------------------------------------------------ next action */

export interface SqlNextAction {
  label: string;
  detail: string;
  to: string;
}

/** The level the learner is working in: the first not yet finished. */
export function currentSqlLevel(data: AppData): SqlLevelId {
  const all = allSqlLevelProgress(data);
  const inProgress = all.find(
    (l) => l.unlocked && l.finalBestPct < data.settings.passThresholdPct
  );
  return inProgress?.levelId ?? 3;
}

/** Drives the SQL dashboard's "resume" button. */
export function sqlNextAction(data: AppData): SqlNextAction {
  if (data.sql.activeExam) {
    return { label: 'Resume your exam', detail: 'You have a SQL exam in progress', to: '/sql/exam' };
  }

  const levelId = currentSqlLevel(data);
  const progress = sqlLevelProgress(data, levelId);

  const unreadLesson = progress.topics.find((t) => !t.lessonRead && t.status !== 'locked');
  if (unreadLesson && unreadLesson.attempted === 0) {
    return {
      label: 'Start ' + unreadLesson.topic.name,
      detail: `Level ${levelId} · read the lesson, then practise`,
      to: `/sql/topic/${unreadLesson.topic.id}`,
    };
  }

  const unfinished = progress.topics.find(
    (t) => t.status === 'available' || t.status === 'in-progress'
  );
  if (unfinished) {
    return {
      label: 'Practise ' + unfinished.topic.name,
      detail: `Level ${levelId} · ${unfinished.attempted}/${unfinished.questionCount} questions attempted`,
      to: `/sql/practice/${unfinished.topic.id}`,
    };
  }

  const final = finalExamForLevel(levelId);
  if (final && progress.finalUnlocked && progress.finalBestPct < data.settings.passThresholdPct) {
    return {
      label: `Take the ${final.name}`,
      detail: 'Every topic in this level is complete',
      to: `/sql/exam/start/${final.id}`,
    };
  }

  if (sqlMistakeQuestions(data).length > 0) {
    return {
      label: 'Review your mistakes',
      detail: 'Sharpen the questions you got wrong',
      to: '/sql/review',
    };
  }

  return {
    label: 'Try a mock test',
    detail: 'Everything unlocked so far is complete',
    to: '/sql/tests',
  };
}

/**
 * Exam scores oldest-first, shaped for the shared `ExamTrendChart` so both
 * majors plot through the same component.
 */
export function sqlScoreTrend(data: AppData): ExamTrendPoint[] {
  return [...data.sql.examResults]
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map((r, index) => ({
      index,
      pct: r.pct,
      at: r.submittedAt,
      level: r.levelId ?? 0,
      kind: r.kind,
    }));
}

export function sqlResultById(data: AppData, id: string): SqlExamResult | undefined {
  return data.sql.examResults.find((r) => r.id === id);
}
