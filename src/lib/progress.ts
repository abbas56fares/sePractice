import type { AppData, LevelId, Topic, TopicStatus } from '../types';
import { LEVELS, contentTopics, finalTopic } from '../data/levels';
import { questionsForLevel, questionsForTopic } from '../data/questions';

export interface TopicProgress {
  topic: Topic;
  status: TopicStatus;
  /** Questions in this topic that have been answered at least once. */
  attempted: number;
  questionCount: number;
  /** Share of the topic's questions attempted, 0-100. */
  completionPct: number;
  /** Correct-on-last-attempt share of attempted questions, 0-100. */
  accuracyPct: number;
  /** Best score on this topic's exam (or the level final), 0-100. */
  bestScorePct: number;
  attemptCount: number;
  practiceMs: number;
  lockReason?: string;
}

/** Best exam percentage recorded for a topic, or for a level final. */
function bestScore(data: AppData, level: LevelId, topicId: string | null): number {
  let best = 0;
  for (const r of data.examResults) {
    if (r.level !== level) continue;
    if (topicId === null ? r.topicId !== null : r.topicId !== topicId) continue;
    if (r.pct > best) best = r.pct;
  }
  return best;
}

export function examCount(data: AppData, level: LevelId, topicId: string | null): number {
  return data.examResults.filter(
    (r) => r.level === level && (topicId === null ? r.topicId === null : r.topicId === topicId)
  ).length;
}

export function isLevelUnlocked(data: AppData, level: LevelId): boolean {
  if (level === 1 || data.settings.unlockMode === 'open') return true;
  const previous = (level - 1) as LevelId;
  return bestScore(data, previous, null) >= data.settings.passThresholdPct;
}

/**
 * Average of the best topic-exam scores across a level's content topics.
 * Topics never sat count as 0, so the average only reaches the threshold once
 * enough of the level has actually been examined.
 */
export function levelTopicAveragePct(data: AppData, level: LevelId): number {
  const topics = contentTopics(level);
  if (topics.length === 0) return 0;
  const total = topics.reduce((n, t) => n + bestScore(data, level, t.id), 0);
  return Math.round(total / topics.length);
}

/**
 * A level's final exam opens once the average of its topic-exam scores reaches
 * the pass threshold - a weak topic can be carried by stronger ones. In `open`
 * mode nothing is gated, which is the escape hatch for free practice.
 */
export function isFinalUnlocked(data: AppData, level: LevelId): boolean {
  if (data.settings.unlockMode === 'open') return true;
  if (!isLevelUnlocked(data, level)) return false;
  return levelTopicAveragePct(data, level) >= data.settings.passThresholdPct;
}

export function topicProgress(data: AppData, topic: Topic): TopicProgress {
  const questions = topic.isFinal ? questionsForLevel(topic.level) : questionsForTopic(topic.id);
  const questionCount = questions.length;

  let attempted = 0;
  let correctLast = 0;
  let practiceMs = 0;
  for (const q of questions) {
    const stat = data.questionStats[q.id];
    if (!stat || stat.attempts === 0) continue;
    attempted += 1;
    if (stat.lastCorrect) correctLast += 1;
    practiceMs += stat.totalMs;
  }

  const best = bestScore(data, topic.level, topic.isFinal ? null : topic.id);
  const attempts = examCount(data, topic.level, topic.isFinal ? null : topic.id);
  const threshold = data.settings.passThresholdPct;

  const levelUnlocked = isLevelUnlocked(data, topic.level);
  const unlocked = topic.isFinal ? isFinalUnlocked(data, topic.level) : levelUnlocked;

  let status: TopicStatus;
  let lockReason: string | undefined;
  if (!unlocked) {
    status = 'locked';
    lockReason = !levelUnlocked
      ? `Score ${threshold}% or more on the Level ${topic.level - 1} final exam to unlock Level ${topic.level}.`
      : `Average ${threshold}% or more across the Level ${topic.level} topic exams to unlock the final exam (currently ${levelTopicAveragePct(data, topic.level)}%).`;
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
    ...(lockReason ? { lockReason } : {}),
  };
}

export interface LevelProgress {
  level: LevelId;
  name: string;
  tagline: string;
  unlocked: boolean;
  topics: TopicProgress[];
  questionCount: number;
  attempted: number;
  /** Content topics marked completed, out of the level's content topics. */
  topicsCompleted: number;
  topicsTotal: number;
  completionPct: number;
  accuracyPct: number;
  finalBestPct: number;
}

export function levelProgress(data: AppData, level: LevelId): LevelProgress {
  const def = LEVELS.find((l) => l.id === level);
  const topics = (def?.topics ?? []).map((t) => topicProgress(data, t));
  const content = topics.filter((t) => !t.topic.isFinal);

  const questionCount = content.reduce((n, t) => n + t.questionCount, 0);
  const attempted = content.reduce((n, t) => n + t.attempted, 0);
  const weightedAccuracy = content.reduce((n, t) => n + (t.accuracyPct * t.attempted) / 100, 0);

  return {
    level,
    name: def?.name ?? '',
    tagline: def?.tagline ?? '',
    unlocked: isLevelUnlocked(data, level),
    topics,
    questionCount,
    attempted,
    topicsCompleted: content.filter((t) => t.status === 'completed').length,
    topicsTotal: content.length,
    completionPct: questionCount === 0 ? 0 : Math.round((attempted / questionCount) * 100),
    accuracyPct: attempted === 0 ? 0 : Math.round((weightedAccuracy / attempted) * 100),
    finalBestPct: bestScore(data, level, null),
  };
}

export function allLevelProgress(data: AppData): LevelProgress[] {
  return LEVELS.map((l) => levelProgress(data, l.id));
}

/** The level the learner is working in: the first that is not yet finished. */
export function currentLevel(data: AppData): LevelId {
  const all = allLevelProgress(data);
  const inProgress = all.find(
    (l) => l.unlocked && l.finalBestPct < data.settings.passThresholdPct
  );
  return inProgress?.level ?? 3;
}

export interface NextAction {
  label: string;
  detail: string;
  to: string;
}

/** Drives the dashboard's "Continue Learning" button. */
export function nextAction(data: AppData): NextAction {
  if (data.activeExam) {
    return {
      label: 'Resume exam',
      detail: 'You have an exam in progress',
      to: '/exam',
    };
  }

  const level = currentLevel(data);
  const progress = levelProgress(data, level);

  const unfinished = progress.topics.find(
    (t) => !t.topic.isFinal && (t.status === 'available' || t.status === 'in-progress')
  );
  if (unfinished) {
    return {
      label: 'Practise ' + unfinished.topic.name,
      detail: `Level ${level} - ${unfinished.attempted}/${unfinished.questionCount} questions attempted`,
      to: `/practice/${unfinished.topic.id}`,
    };
  }

  const final = finalTopic(level);
  if (final && isFinalUnlocked(data, level)) {
    return {
      label: `Take the Level ${level} final exam`,
      detail: 'Every topic in this level is complete',
      to: `/exam/start/${final.id}`,
    };
  }

  return {
    label: 'Review your mistakes',
    detail: 'Sharpen the questions you got wrong',
    to: '/review',
  };
}
