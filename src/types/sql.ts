/**
 * Domain model for the SQL major.
 *
 * Deliberately built on the same primitives as the Java bank — `Difficulty`,
 * `OptionId`, `AnswerOption`, `QuestionStat`, `PracticeEvent` are all reused —
 * so the two majors share difficulty badges, option rendering and progress
 * accounting instead of duplicating them. What SQL adds is the things Java
 * does not have: executable exercises, datasets, and a third exam kind.
 */

import type { AnswerOption, Difficulty, OptionId, PracticeEvent, QuestionStat } from './index';
import type { CompareOptions } from '../lib/sql';

/** 1 Basics, 2 Normal, 3 Advanced. */
export type SqlLevelId = 1 | 2 | 3;

/** Which engine a question's syntax is written for. */
export type SqlDialect = 'postgresql' | 'standard' | 'mysql' | 'sqlserver';

/**
 * Exercise shapes, matching the seven types the module teaches.
 * The first five are option-based; the last two execute the learner's SQL.
 */
export type SqlQuestionType =
  | 'mcq' // syntax, semantics, "which query is right"
  | 'predict' // given a query and tables, what comes back
  | 'error' // find the defect in a broken query
  | 'explain' // say what a query does, or why a result looks like that
  | 'schema' // keys, relationships, integrity, design
  | 'write' // write the query from a requirement
  | 'complete'; // fill in the missing clause

export const SQL_CHOICE_TYPES: readonly SqlQuestionType[] = [
  'mcq',
  'predict',
  'error',
  'explain',
  'schema',
];

export function isChoiceType(type: SqlQuestionType): boolean {
  return SQL_CHOICE_TYPES.includes(type);
}

export interface SqlQuestionBase {
  /** Globally unique and stable, e.g. `SQL-L1-SELECT-003`. */
  id: string;
  levelId: SqlLevelId;
  topicId: string;
  difficulty: Difficulty;
  /** Short label for lists and review screens. */
  title: string;
  /** The question statement. */
  prompt: string;
  dialect: SqlDialect;
  /** Dataset the question is set against; defaults to the topic's dataset. */
  datasetId?: string;
  /** Snippet shown above the options or the editor. */
  code?: string;
  /** Progressive nudges, revealed one at a time. */
  hints: string[];
  /** Why the answer is what it is, shown after submission. */
  explanation: string;
  estMinutes: number;
  /** Weight in an exam. Defaults to 1. */
  points?: number;
  /** Concept tags, used by the topic filter and weak-area analysis. */
  tags: string[];
  /** A note when the syntax differs on another engine. */
  dialectNote?: string;
}

export interface SqlChoiceQuestion extends SqlQuestionBase {
  type: 'mcq' | 'predict' | 'error' | 'explain' | 'schema';
  options: AnswerOption[];
  answer: OptionId;
  /** Why each other option is wrong. Keyed by option id. */
  whyWrong: Partial<Record<OptionId, string>>;
  /**
   * Lets the verifier confirm the key by execution rather than by review:
   * it runs `sql` and asserts the rendered result contains `expect`.
   */
  verifyWith?: { sql: string; expect: string; datasetId?: string };
}

export interface SqlRejectedQuery {
  /** What this near-miss represents, e.g. "forgets DISTINCT". */
  label: string;
  sql: string;
}

export interface SqlExecutableQuestion extends SqlQuestionBase {
  type: 'write' | 'complete';
  /** The reference answer. Its result *is* the expected result. */
  solution: string;
  /** Pre-filled editor content. For `complete`, the query with blanks. */
  starter?: string;
  /** What the learner's query is allowed to do. Defaults to read-only. */
  permission?: 'read-only' | 'read-write';
  /** Grading strictness. Order and column names are off unless asked for. */
  grading?: Partial<CompareOptions>;
  /** Declared output columns, checked by the verifier against the solution. */
  expectedColumns?: string[];
  /** An empty result is a legitimate answer here. */
  allowEmptyResult?: boolean;
  /** Near-miss queries the verifier proves are genuinely wrong. */
  rejects?: SqlRejectedQuery[];
  /** Shown instead of a generic message when a common mistake is detected. */
  commonMistakes?: { pattern: string; advice: string }[];
}

export type SqlQuestion = SqlChoiceQuestion | SqlExecutableQuestion;

export function isExecutable(q: SqlQuestion): q is SqlExecutableQuestion {
  return q.type === 'write' || q.type === 'complete';
}

export function isChoice(q: SqlQuestion): q is SqlChoiceQuestion {
  return !isExecutable(q);
}

/* ------------------------------------------------------- topics & levels */

export interface SqlTopic {
  id: string;
  levelId: SqlLevelId;
  order: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  /** Dataset questions in this topic use unless they override it. */
  datasetId: string;
  /** Concepts covered, shown on the topic card and searched by the filter. */
  concepts: string[];
}

export interface SqlLevel {
  id: SqlLevelId;
  slug: 'basics' | 'normal' | 'advanced';
  name: string;
  tagline: string;
  description: string;
  topics: SqlTopic[];
}

/* -------------------------------------------------------------- lessons */

export interface LessonExample {
  /** What the example demonstrates. */
  caption: string;
  sql: string;
  /** Tables the example reads, so the lesson can show them inline. */
  showTables?: string[];
  /** Explanation of the result shown underneath. */
  note?: string;
  /** Run against this dataset instead of the topic's. */
  datasetId?: string;
  /** The example is expected to fail — the error is the lesson. */
  expectError?: boolean;
}

export interface Lesson {
  topicId: string;
  /** One-sentence definition. */
  definition: string;
  /** Syntax template, shown as a code block. */
  syntax?: string;
  /** Worked examples, executed live against the dataset. */
  examples: LessonExample[];
  /** Mistakes worth naming explicitly. */
  pitfalls: { title: string; body: string }[];
  /** Topic ids worth reading next. */
  related: string[];
  /** Notes on how other engines differ. */
  dialectNotes?: { engine: string; note: string }[];
}

/* ----------------------------------------------------------------- exams */

export type SqlExamKind = 'topic' | 'mock' | 'final';

export interface SqlExamConfig {
  id: string;
  kind: SqlExamKind;
  name: string;
  description: string;
  /** `null` for a mixed or comprehensive paper. */
  levelId: SqlLevelId | null;
  /** `null` unless the paper is scoped to one topic. */
  topicId: string | null;
  questionCount: number;
  durationMinutes: number;
  passPct: number;
  /** How many questions to draw from each level, for mixed papers. */
  levelMix?: Partial<Record<SqlLevelId, number>>;
  /** Share of the paper that should be executable exercises, 0-1. */
  executableShare?: number;
}

export interface SqlActiveExam {
  id: string;
  configId: string;
  kind: SqlExamKind;
  levelId: SqlLevelId | null;
  topicId: string | null;
  questionIds: string[];
  /** Option choice for a choice question. */
  answers: Partial<Record<string, OptionId>>;
  /** Submitted SQL for an executable question. */
  queries: Partial<Record<string, string>>;
  flagged: string[];
  startedAt: number;
  /** Absolute epoch deadline — a refresh cannot restart the clock. */
  deadline: number;
  durationMs: number;
  currentIndex: number;
  timePerQuestion: Partial<Record<string, number>>;
}

export interface SqlExamResult {
  id: string;
  configId: string;
  kind: SqlExamKind;
  levelId: SqlLevelId | null;
  topicId: string | null;
  questionIds: string[];
  answers: Partial<Record<string, OptionId>>;
  queries: Partial<Record<string, string>>;
  /** Per-question correctness, resolved once at submission time. */
  correct: Record<string, boolean>;
  flagged: string[];
  timePerQuestion: Partial<Record<string, number>>;
  startedAt: number;
  submittedAt: number;
  elapsedMs: number;
  allowedMs: number;
  autoSubmitted: boolean;
  score: number;
  total: number;
  pct: number;
  passPct: number;
}

/* ------------------------------------------------------------- progress */

export interface SqlProgressData {
  /** Reuses the Java bank's per-question statistics shape. */
  questionStats: Record<string, QuestionStat>;
  flagged: string[];
  examResults: SqlExamResult[];
  activeExam: SqlActiveExam | null;
  practiceLog: PracticeEvent[];
  /** Topic ids whose lesson has been marked read. */
  lessonsRead: string[];
  /** Last editor contents per question, so a draft survives navigation. */
  drafts: Record<string, string>;
}

export function emptySqlProgress(): SqlProgressData {
  return {
    questionStats: {},
    flagged: [],
    examResults: [],
    activeExam: null,
    practiceLog: [],
    lessonsRead: [],
    drafts: {},
  };
}
