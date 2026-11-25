import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActiveExam,
  AppData,
  ExamResult,
  LevelId,
  OptionId,
  QuestionStat,
  Settings,
} from '../types';
import type { SqlActiveExam, SqlExamResult } from '../types/sql';
import { finalizeExam } from '../lib/exam';
import { finalizeSqlExam } from '../lib/sql-exam';
import { getQuestion } from '../data/questions';
import { getSqlQuestion } from '../data/sql/questions';
import { emptySqlProgress } from '../types/sql';
import {
  emptyData,
  localRepository,
  migrate,
  type ProgressRepository,
} from '../lib/storage';

export type Action =
  | {
      type: 'practice:answer';
      questionId: string;
      correct: boolean;
      ms: number;
    }
  | { type: 'flag:toggle'; questionId: string }
  | { type: 'flag:clear' }
  | { type: 'exam:start'; exam: ActiveExam }
  | { type: 'exam:answer'; questionId: string; option: OptionId }
  | { type: 'exam:flag'; questionId: string }
  | { type: 'exam:goto'; index: number }
  | { type: 'exam:accrue'; questionId: string; ms: number }
  | { type: 'exam:submit'; auto: boolean }
  | { type: 'exam:abandon' }
  | { type: 'settings:update'; patch: Partial<Settings> }
  | { type: 'data:replace'; data: AppData }
  | { type: 'data:reset' }
  /* ------------------------------------------------------------ SQL major */
  | { type: 'sql:answer'; questionId: string; correct: boolean; ms: number }
  | { type: 'sql:flag'; questionId: string }
  | { type: 'sql:draft'; questionId: string; sql: string }
  | { type: 'sql:lesson-read'; topicId: string; read: boolean }
  | { type: 'sql:exam:start'; exam: SqlActiveExam }
  | { type: 'sql:exam:answer'; questionId: string; option: OptionId }
  | { type: 'sql:exam:query'; questionId: string; sql: string }
  | { type: 'sql:exam:flag'; questionId: string }
  | { type: 'sql:exam:goto'; index: number }
  | { type: 'sql:exam:accrue'; questionId: string; ms: number }
  | { type: 'sql:exam:submit'; auto: boolean; passPct: number }
  | { type: 'sql:exam:abandon' }
  | { type: 'sql:reset' };

function bumpStat(
  stats: Record<string, QuestionStat>,
  questionId: string,
  correct: boolean,
  ms: number,
  at: number
): Record<string, QuestionStat> {
  const prev = stats[questionId];
  return {
    ...stats,
    [questionId]: {
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
      lastCorrect: correct,
      lastAnsweredAt: at,
      totalMs: (prev?.totalMs ?? 0) + ms,
    },
  };
}

function reduce(state: AppData, action: Action): AppData {
  const now = Date.now();
  const touched = (next: Partial<AppData>): AppData => ({ ...state, ...next, updatedAt: now });

  switch (action.type) {
    case 'practice:answer': {
      const q = getQuestion(action.questionId);
      if (!q) return state;
      return touched({
        questionStats: bumpStat(
          state.questionStats,
          action.questionId,
          action.correct,
          action.ms,
          now
        ),
        practiceLog: [
          ...state.practiceLog,
          {
            questionId: q.id,
            topicId: q.topicId,
            level: q.level,
            correct: action.correct,
            ms: action.ms,
            at: now,
          },
        ],
      });
    }

    case 'flag:toggle': {
      const has = state.flagged.includes(action.questionId);
      return touched({
        flagged: has
          ? state.flagged.filter((id) => id !== action.questionId)
          : [...state.flagged, action.questionId],
      });
    }

    case 'flag:clear':
      return touched({ flagged: [] });

    case 'exam:start':
      return touched({ activeExam: action.exam });

    case 'exam:answer': {
      if (!state.activeExam) return state;
      return touched({
        activeExam: {
          ...state.activeExam,
          answers: { ...state.activeExam.answers, [action.questionId]: action.option },
        },
      });
    }

    case 'exam:flag': {
      const exam = state.activeExam;
      if (!exam) return state;
      const has = exam.flagged.includes(action.questionId);
      return touched({
        activeExam: {
          ...exam,
          flagged: has
            ? exam.flagged.filter((id) => id !== action.questionId)
            : [...exam.flagged, action.questionId],
        },
      });
    }

    case 'exam:goto': {
      const exam = state.activeExam;
      if (!exam) return state;
      const index = Math.max(0, Math.min(exam.questionIds.length - 1, action.index));
      return touched({ activeExam: { ...exam, currentIndex: index } });
    }

    case 'exam:accrue': {
      const exam = state.activeExam;
      if (!exam || action.ms <= 0) return state;
      return touched({
        activeExam: {
          ...exam,
          timePerQuestion: {
            ...exam.timePerQuestion,
            [action.questionId]: (exam.timePerQuestion[action.questionId] ?? 0) + action.ms,
          },
        },
      });
    }

    case 'exam:submit': {
      const exam = state.activeExam;
      if (!exam) return state;
      const result = finalizeExam(exam, action.auto, now);

      // Exam answers count toward per-question history too, so the mistake
      // review and the weak-topic analysis see exam performance, not just
      // practice.
      let stats = state.questionStats;
      for (const id of exam.questionIds) {
        const given = exam.answers[id];
        if (!given) continue;
        const q = getQuestion(id);
        if (!q) continue;
        stats = bumpStat(stats, id, given === q.answer, exam.timePerQuestion[id] ?? 0, now);
      }

      return touched({
        activeExam: null,
        examResults: [...state.examResults, result],
        questionStats: stats,
      });
    }

    case 'exam:abandon':
      return touched({ activeExam: null });

    case 'settings:update':
      return touched({ settings: { ...state.settings, ...action.patch } });

    case 'data:replace':
      return { ...action.data, updatedAt: now };

    case 'data:reset':
      return emptyData();

    /* ---------------------------------------------------------- SQL major */

    case 'sql:answer': {
      const q = getSqlQuestion(action.questionId);
      if (!q) return state;
      return touched({
        sql: {
          ...state.sql,
          questionStats: bumpStat(
            state.sql.questionStats,
            action.questionId,
            action.correct,
            action.ms,
            now
          ),
          practiceLog: [
            ...state.sql.practiceLog,
            {
              questionId: q.id,
              topicId: q.topicId,
              level: q.levelId,
              correct: action.correct,
              ms: action.ms,
              at: now,
            },
          ],
        },
      });
    }

    case 'sql:flag': {
      const has = state.sql.flagged.includes(action.questionId);
      return touched({
        sql: {
          ...state.sql,
          flagged: has
            ? state.sql.flagged.filter((id) => id !== action.questionId)
            : [...state.sql.flagged, action.questionId],
        },
      });
    }

    case 'sql:draft':
      return touched({
        sql: { ...state.sql, drafts: { ...state.sql.drafts, [action.questionId]: action.sql } },
      });

    case 'sql:lesson-read': {
      const has = state.sql.lessonsRead.includes(action.topicId);
      if (has === action.read) return state;
      return touched({
        sql: {
          ...state.sql,
          lessonsRead: action.read
            ? [...state.sql.lessonsRead, action.topicId]
            : state.sql.lessonsRead.filter((id) => id !== action.topicId),
        },
      });
    }

    case 'sql:exam:start':
      return touched({ sql: { ...state.sql, activeExam: action.exam } });

    case 'sql:exam:answer': {
      const exam = state.sql.activeExam;
      if (!exam) return state;
      return touched({
        sql: {
          ...state.sql,
          activeExam: {
            ...exam,
            answers: { ...exam.answers, [action.questionId]: action.option },
          },
        },
      });
    }

    case 'sql:exam:query': {
      const exam = state.sql.activeExam;
      if (!exam) return state;
      return touched({
        sql: {
          ...state.sql,
          activeExam: { ...exam, queries: { ...exam.queries, [action.questionId]: action.sql } },
        },
      });
    }

    case 'sql:exam:flag': {
      const exam = state.sql.activeExam;
      if (!exam) return state;
      const has = exam.flagged.includes(action.questionId);
      return touched({
        sql: {
          ...state.sql,
          activeExam: {
            ...exam,
            flagged: has
              ? exam.flagged.filter((id) => id !== action.questionId)
              : [...exam.flagged, action.questionId],
          },
        },
      });
    }

    case 'sql:exam:goto': {
      const exam = state.sql.activeExam;
      if (!exam) return state;
      const index = Math.max(0, Math.min(exam.questionIds.length - 1, action.index));
      return touched({ sql: { ...state.sql, activeExam: { ...exam, currentIndex: index } } });
    }

    case 'sql:exam:accrue': {
      const exam = state.sql.activeExam;
      if (!exam || action.ms <= 0) return state;
      return touched({
        sql: {
          ...state.sql,
          activeExam: {
            ...exam,
            timePerQuestion: {
              ...exam.timePerQuestion,
              [action.questionId]: (exam.timePerQuestion[action.questionId] ?? 0) + action.ms,
            },
          },
        },
      });
    }

    case 'sql:exam:submit': {
      const exam = state.sql.activeExam;
      if (!exam) return state;
      const result = finalizeSqlExam(exam, action.passPct, action.auto, now);

      // Exam outcomes count toward per-question history too, so mistake
      // review and weak-topic analysis see exam performance, not just practice.
      let stats = state.sql.questionStats;
      for (const id of exam.questionIds) {
        const answered = exam.answers[id] !== undefined || exam.queries[id] !== undefined;
        if (!answered) continue;
        stats = bumpStat(stats, id, Boolean(result.correct[id]), exam.timePerQuestion[id] ?? 0, now);
      }

      return touched({
        sql: {
          ...state.sql,
          activeExam: null,
          examResults: [...state.sql.examResults, result],
          questionStats: stats,
        },
      });
    }

    case 'sql:exam:abandon':
      return touched({ sql: { ...state.sql, activeExam: null } });

    case 'sql:reset':
      return touched({ sql: emptySqlProgress() });

    default:
      return state;
  }
}

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface AppContextValue {
  data: AppData;
  dispatch: (action: Action) => void;
  /** Most recently submitted exam, for the results screen. */
  lastResult: ExamResult | undefined;
  resultById: (id: string) => ExamResult | undefined;
  /** Most recently submitted SQL exam. */
  lastSqlResult: SqlExamResult | undefined;
  sqlResultById: (id: string) => SqlExamResult | undefined;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  /** Resolved theme actually applied to the document. */
  resolvedTheme: 'light' | 'dark';
  importJson: (text: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function initialData(repo: ProgressRepository): AppData {
  return repo.load() ?? emptyData();
}

export function AppProvider({
  children,
  repository = localRepository,
}: {
  children: ReactNode;
  repository?: ProgressRepository;
}) {
  const [data, dispatch] = useReducer(reduce, repository, initialData);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Persist on every change. localStorage writes are synchronous and tiny
  // here, so there is no need for debouncing machinery.
  useEffect(() => {
    repository.save(data);
  }, [data, repository]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ------------------------------------------------------------------ theme */
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    data.settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : data.settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  /* ----------------------------------------------------------------- import */
  const importJson = useCallback(
    (text: string) => {
      try {
        const parsed = migrate(JSON.parse(text));
        if (!parsed) {
          notify('That file is not a recognised progress export.', 'error');
          return false;
        }
        dispatch({ type: 'data:replace', data: parsed });
        notify('Progress imported.', 'success');
        return true;
      } catch {
        notify('Could not read that file as JSON.', 'error');
        return false;
      }
    },
    [notify]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      dispatch,
      lastResult: data.examResults[data.examResults.length - 1],
      resultById: (id: string) => data.examResults.find((r) => r.id === id),
      lastSqlResult: data.sql.examResults[data.sql.examResults.length - 1],
      sqlResultById: (id: string) => data.sql.examResults.find((r) => r.id === id),
      toasts,
      notify,
      dismissToast,
      resolvedTheme,
      importJson,
    }),
    [data, toasts, notify, dismissToast, resolvedTheme, importJson]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function useSettings(): Settings {
  return useApp().data.settings;
}

/** Levels are a fixed trio; this keeps the cast in one place. */
export function asLevelId(value: string | number | undefined): LevelId | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
}
