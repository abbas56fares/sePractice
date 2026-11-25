/** Domain model for the assessment platform. */

import type { SqlProgressData } from './sql';

export type LevelId = 1 | 2 | 3;

export type Difficulty = 'easy' | 'medium' | 'hard';

export type OptionId = 'a' | 'b' | 'c' | 'd';

export const OPTION_IDS: readonly OptionId[] = ['a', 'b', 'c', 'd'];

/**
 * What skill a question exercises. Drives the icon/label on the question card
 * and lets Practice mode be filtered by question shape as well as by topic.
 */
export type QuestionKind =
  | 'output' // predict what the snippet prints
  | 'concept' // language semantics, no snippet required
  | 'compile' // does it compile? which error?
  | 'bug' // find the defect
  | 'complexity' // time/space analysis
  | 'sql'
  | 'react';

export type CodeLang = 'java' | 'sql' | 'tsx';

export interface AnswerOption {
  id: OptionId;
  text: string;
}

export interface Question {
  /** Globally unique, stable across releases (e.g. `L1-VAR-003`). */
  id: string;
  level: LevelId;
  topicId: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  /** The question statement. Plain text. */
  prompt: string;
  /** Optional snippet rendered with syntax highlighting above the options. */
  code?: string;
  codeLang?: CodeLang;
  options: AnswerOption[];
  answer: OptionId;
  /** Why the keyed answer is correct. */
  explanation: string;
  /** Why each of the three other options is wrong. Keyed by option id. */
  whyWrong: Partial<Record<OptionId, string>>;
  /** Nudge shown on demand in Practice mode, before the answer is revealed. */
  hint?: string;
  /** Dev-only: how the build-time JDK check validates this answer key. */
  verify?: VerifySpec;
}

export interface Topic {
  id: string;
  level: LevelId;
  /** 1-based position in the level roadmap. */
  order: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  /** The level's capstone. Draws from every topic in the level. */
  isFinal?: boolean;
}

export interface Level {
  id: LevelId;
  name: string;
  tagline: string;
  description: string;
  topics: Topic[];
}

/* ------------------------------------------------------------------ progress */

export interface QuestionStat {
  attempts: number;
  correct: number;
  /** Outcome of the most recent attempt — drives "practise my mistakes". */
  lastCorrect: boolean;
  lastAnsweredAt: number;
  /** Cumulative time spent on this question, practice + exam. */
  totalMs: number;
}

export type TopicStatus = 'locked' | 'available' | 'in-progress' | 'completed';

/* ---------------------------------------------------------------------- exam */

export type ExamKind = 'topic' | 'final';

export interface ActiveExam {
  id: string;
  level: LevelId;
  /** `null` for a level final, which spans every topic in the level. */
  topicId: string | null;
  kind: ExamKind;
  questionIds: string[];
  answers: Partial<Record<string, OptionId>>;
  flagged: string[];
  startedAt: number;
  /** Absolute epoch deadline. Persisted, so a refresh cannot reset the clock. */
  deadline: number;
  durationMs: number;
  currentIndex: number;
  /** Per-question dwell time, accumulated as the user navigates. */
  timePerQuestion: Partial<Record<string, number>>;
}

export interface ExamResult {
  id: string;
  level: LevelId;
  topicId: string | null;
  kind: ExamKind;
  questionIds: string[];
  answers: Partial<Record<string, OptionId>>;
  flagged: string[];
  timePerQuestion: Partial<Record<string, number>>;
  startedAt: number;
  submittedAt: number;
  /** Wall-clock time actually used, capped at the allowance. */
  elapsedMs: number;
  allowedMs: number;
  autoSubmitted: boolean;
  score: number;
  total: number;
  pct: number;
}

/* ------------------------------------------------------------------ settings */

export type ThemePreference = 'light' | 'dark' | 'system';

/** How strictly the roadmap gates content. */
export type UnlockMode = 'gated' | 'open';

export interface Settings {
  theme: ThemePreference;
  /** Level final exam defaults: 30 questions in 60 minutes. */
  finalExamQuestions: number;
  finalExamMinutes: number;
  topicExamQuestions: number;
  topicExamMinutes: number;
  /** Score needed to mark a topic/level complete and unlock what follows. */
  passThresholdPct: number;
  unlockMode: UnlockMode;
  /** Minutes remaining at which the exam timer starts warning. */
  timerWarningMinutes: number;
  shuffleQuestions: boolean;
  hintsEnabled: boolean;
  /** SQL topic-practice exam size, separate from the Java defaults. */
  sqlTopicExamQuestions: number;
  sqlTopicExamMinutes: number;
  /** Reveal the reference solution on an executable exercise after a try. */
  sqlRevealSolution: boolean;
}

/* --------------------------------------------------------------- persistence */

export interface PracticeEvent {
  questionId: string;
  topicId: string;
  level: LevelId;
  correct: boolean;
  ms: number;
  at: number;
}

export interface AppData {
  /** Bumped when the shape changes so `migrate()` can upgrade old payloads. */
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  questionStats: Record<string, QuestionStat>;
  flagged: string[];
  examResults: ExamResult[];
  activeExam: ActiveExam | null;
  /** Append-only practice log, used for the activity chart and time totals. */
  practiceLog: PracticeEvent[];
  /**
   * The SQL major's progress, kept in its own block so the two majors can
   * never interfere with each other's accounting. Added in schema 2; a
   * schema-1 payload is upgraded by filling this in empty, never by resetting
   * anything that was already stored.
   */
  sql: SqlProgressData;
}

/* -------------------------------------------------- question-bank validation */

/**
 * How `scripts/verify-java.mjs` should check a question's answer key against a
 * real JDK. Omit for questions whose answer is not mechanically checkable
 * (pure concept questions, complexity analysis, SQL, React).
 *
 * - `stdout`         — run the snippet; stdout must equal `expect`, defaulting
 *                      to the text of the keyed correct option.
 * - `compile-error`  — `javac` must reject the snippet.
 * - `runtime-throws` — it must compile, then throw at runtime (optionally of
 *                      the class named in `expect`).
 */
export interface VerifySpec {
  mode: 'stdout' | 'compile-error' | 'runtime-throws';
  expect?: string;
}
