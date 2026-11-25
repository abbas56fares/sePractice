/**
 * Mock tests and final exams.
 *
 * Mock tests are practice papers you can sit any number of times. Final exams
 * are the graded capstones, one per level plus a comprehensive paper. Topic
 * exams are not listed here: they are generated from the topic plus the
 * `sqlTopicExamQuestions` / `sqlTopicExamMinutes` settings, the same way the
 * Java major does it.
 */

import type { SqlExamConfig } from '../../types/sql';

export const SQL_MOCK_TESTS: SqlExamConfig[] = [
  {
    id: 'sql-mock-basics',
    kind: 'mock',
    name: 'Basics Mock Test',
    description:
      'Thirty questions on single-table SQL: selecting, filtering, sorting, NULL handling and the aggregate functions.',
    levelId: 1,
    topicId: null,
    questionCount: 30,
    durationMinutes: 45,
    passPct: 70,
    executableShare: 0.25,
  },
  {
    id: 'sql-mock-normal',
    kind: 'mock',
    name: 'Normal Mock Test',
    description:
      'Thirty questions combining clauses: grouping, the join family, subqueries, set operations and conditional logic.',
    levelId: 2,
    topicId: null,
    questionCount: 30,
    durationMinutes: 60,
    passPct: 70,
    executableShare: 0.3,
  },
  {
    id: 'sql-mock-advanced',
    kind: 'mock',
    name: 'Advanced Mock Test',
    description:
      'Thirty questions at interview level: window functions, CTEs, correlated subqueries, schema design and performance.',
    levelId: 3,
    topicId: null,
    questionCount: 30,
    durationMinutes: 60,
    passPct: 70,
    executableShare: 0.3,
  },
  {
    id: 'sql-mock-mixed',
    kind: 'mock',
    name: 'Mixed Mock Test',
    description:
      'Thirty questions drawn across all three levels, weighted towards the middle — the closest thing here to a real screening test.',
    levelId: null,
    topicId: null,
    questionCount: 30,
    durationMinutes: 60,
    passPct: 70,
    levelMix: { 1: 10, 2: 11, 3: 9 },
    executableShare: 0.3,
  },
];

export const SQL_FINAL_EXAMS: SqlExamConfig[] = [
  {
    id: 'sql-final-basics',
    kind: 'final',
    name: 'SQL Basics Final Exam',
    description:
      'The graded capstone for Basics. Broader than any single topic exam, with a mixture of question types across all seven topics.',
    levelId: 1,
    topicId: null,
    questionCount: 25,
    durationMinutes: 40,
    passPct: 70,
    executableShare: 0.28,
  },
  {
    id: 'sql-final-normal',
    kind: 'final',
    name: 'SQL Normal Final Exam',
    description:
      'The graded capstone for Normal. Expect questions that need two or three clauses working together rather than one in isolation.',
    levelId: 2,
    topicId: null,
    questionCount: 28,
    durationMinutes: 55,
    passPct: 70,
    executableShare: 0.32,
  },
  {
    id: 'sql-final-advanced',
    kind: 'final',
    name: 'SQL Advanced Final Exam',
    description:
      'The graded capstone for Advanced: window functions, CTEs, correlated subqueries, design and performance in one paper.',
    levelId: 3,
    topicId: null,
    questionCount: 28,
    durationMinutes: 60,
    passPct: 70,
    executableShare: 0.32,
  },
  {
    id: 'sql-final-comprehensive',
    kind: 'final',
    name: 'Comprehensive SQL Final Exam',
    description:
      'Every level in one paper, weighted towards combining concepts rather than recalling them. The last thing to sit before a real screen.',
    levelId: null,
    topicId: null,
    questionCount: 35,
    durationMinutes: 75,
    passPct: 70,
    levelMix: { 1: 10, 2: 13, 3: 12 },
    executableShare: 0.34,
  },
];

export const SQL_EXAM_CONFIGS: SqlExamConfig[] = [...SQL_MOCK_TESTS, ...SQL_FINAL_EXAMS];

const BY_ID = new Map(SQL_EXAM_CONFIGS.map((c) => [c.id, c]));

export function getSqlExamConfig(id: string): SqlExamConfig | undefined {
  return BY_ID.get(id);
}

/** The final exam that acts as a level's capstone. */
export function finalExamForLevel(levelId: number): SqlExamConfig | undefined {
  return SQL_FINAL_EXAMS.find((c) => c.levelId === levelId);
}

export const COMPREHENSIVE_FINAL_ID = 'sql-final-comprehensive';
