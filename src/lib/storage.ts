import type { AppData, Settings } from '../types';
import { emptySqlProgress } from '../types/sql';

/**
 * 2 added the `sql` block for the SQL major. Upgrading from 1 fills it in
 * empty and leaves every existing field exactly as it was found.
 */
export const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'java-assessment:v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  finalExamQuestions: 30,
  finalExamMinutes: 60,
  topicExamQuestions: 10,
  topicExamMinutes: 20,
  passThresholdPct: 70,
  unlockMode: 'gated',
  timerWarningMinutes: 5,
  shuffleQuestions: true,
  hintsEnabled: true,
  sqlTopicExamQuestions: 10,
  sqlTopicExamMinutes: 20,
  sqlRevealSolution: true,
};

export function emptyData(): AppData {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    questionStats: {},
    flagged: [],
    examResults: [],
    activeExam: null,
    practiceLog: [],
    sql: emptySqlProgress(),
  };
}

/**
 * The only thing the app knows about where progress lives. Swapping in a
 * server-backed implementation means writing another object with these three
 * methods — nothing above this line changes.
 */
export interface ProgressRepository {
  load(): AppData | null;
  save(data: AppData): void;
  clear(): void;
}

/**
 * Upgrades a payload written by an older build. Unknown or newer versions fall
 * back to a fresh profile rather than risking a crash on malformed state.
 */
export function migrate(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<AppData>;
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) return null;

  const base = emptyData();
  const storedSql = (data.sql ?? {}) as Partial<AppData['sql']>;

  return {
    ...base,
    ...data,
    schemaVersion: SCHEMA_VERSION,
    // Merge settings so a newly added setting gets its default instead of undefined.
    settings: { ...base.settings, ...(data.settings ?? {}) },
    questionStats: data.questionStats ?? {},
    flagged: Array.isArray(data.flagged) ? data.flagged : [],
    examResults: Array.isArray(data.examResults) ? data.examResults : [],
    practiceLog: Array.isArray(data.practiceLog) ? data.practiceLog : [],
    activeExam: data.activeExam ?? null,
    // Schema 1 had no SQL block at all; schema 2 payloads may still predate a
    // field added inside it. Both cases fill forward from the empty shape.
    sql: {
      ...base.sql,
      ...storedSql,
      questionStats: storedSql.questionStats ?? {},
      flagged: Array.isArray(storedSql.flagged) ? storedSql.flagged : [],
      examResults: Array.isArray(storedSql.examResults) ? storedSql.examResults : [],
      practiceLog: Array.isArray(storedSql.practiceLog) ? storedSql.practiceLog : [],
      lessonsRead: Array.isArray(storedSql.lessonsRead) ? storedSql.lessonsRead : [],
      drafts: storedSql.drafts ?? {},
      activeExam: storedSql.activeExam ?? null,
    },
  };
}

export const localRepository: ProgressRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      // Corrupt or unreadable storage (private mode, quota, hand-edited JSON):
      // start clean rather than leaving the app unusable.
      return null;
    }
  },

  save(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded or storage disabled. The session still works in memory.
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing we can do */
    }
  },
};

/* ------------------------------------------------------------------- export */

export function toJsonExport(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

function csvCell(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Exam history as CSV, for a spreadsheet or a progress journal. */
export function toCsvExport(data: AppData): string {
  const header = [
    'exam_id',
    'date',
    'level',
    'topic',
    'kind',
    'score',
    'total',
    'percent',
    'minutes_used',
    'minutes_allowed',
    'auto_submitted',
  ];
  const rows = data.examResults.map((r) => [
    r.id,
    new Date(r.submittedAt).toISOString(),
    r.level,
    r.topicId ?? 'level-final',
    r.kind,
    r.score,
    r.total,
    r.pct,
    Math.round(r.elapsedMs / 60000),
    Math.round(r.allowedMs / 60000),
    r.autoSubmitted,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
