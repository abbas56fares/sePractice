import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Flag,
  RotateCcw,
  Target,
  Timer,
  XCircle,
} from 'lucide-react';
import type { SqlQuestion } from '../../types/sql';
import { isExecutable } from '../../types/sql';
import { useApp } from '../../state/AppContext';
import { getSqlTopic } from '../../data/sql/levels';
import { getSqlDatasetFor, sqlQuestionsForTags, sqlQuestionsForTopic } from '../../data/sql/questions';
import {
  sqlFlaggedQuestions,
  sqlMistakeQuestions,
  sqlRepeatedMistakes,
  sqlTopicProgress,
} from '../../lib/sql-progress';
import { gradeChoice, gradeExecutable, type GradeResult } from '../../lib/sql-grading';
import { formatDuration, pct } from '../../lib/format';
import { SqlQuestionView, type SqlAnswerState } from '../../components/sql/SqlQuestionView';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  StatCard,
} from '../../components/ui';
import { NotFound } from '../NotFound';

export type SqlPracticeFilter = 'all' | 'mistakes' | 'flagged' | 'unattempted' | 'exercises';

const FILTER_LABEL: Record<SqlPracticeFilter, string> = {
  all: 'All questions',
  mistakes: 'Only my incorrect answers',
  flagged: 'Only flagged questions',
  unattempted: 'Only questions I have not tried',
  exercises: 'Only query-writing exercises',
};

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft size={15} />
      {label}
    </Link>
  );
}

/**
 * The SQL practice engine.
 *
 * Untimed and explanatory, the counterpart of the Java practice session: it
 * reveals the answer on submission, explains every distractor, offers
 * progressive hints and keeps no clock pressure. What it adds is that an
 * executable exercise is graded by running the learner's query, so submitting
 * one does real work rather than comparing an id.
 */
export function SqlPracticeSession({
  questions,
  title,
  subtitle,
  backTo,
  backLabel,
  emptyBody,
}: {
  questions: SqlQuestion[];
  title: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
  emptyBody: string;
}) {
  const { data, dispatch } = useApp();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SqlAnswerState>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  const current = questions[Math.min(index, Math.max(0, questions.length - 1))];

  // Time on the visible question, reset whenever it changes so navigating
  // back and forth cannot inflate the recorded duration.
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [current?.id]);

  const [sessionMs, setSessionMs] = useState(0);
  const sessionStart = useRef(0);
  useEffect(() => {
    sessionStart.current = Date.now();
    const id = window.setInterval(() => setSessionMs(Date.now() - sessionStart.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Restore any saved draft for an executable question.
  const answerFor = useCallback(
    (q: SqlQuestion): SqlAnswerState => {
      const held = answers[q.id];
      if (held) return held;
      if (isExecutable(q)) {
        const draft = data.sql.drafts[q.id];
        return { sql: draft ?? q.starter ?? '' };
      }
      return {};
    },
    [answers, data.sql.drafts]
  );

  const submit = useCallback(() => {
    if (!current || revealed[current.id]) return;
    const answer = answerFor(current);

    let correct: boolean;
    if (isExecutable(current)) {
      if (!answer.sql?.trim()) return;
      const grade = gradeExecutable(current, getSqlDatasetFor(current), answer.sql);
      setGrades((g) => ({ ...g, [current.id]: grade }));
      correct = grade.correct;
      dispatch({ type: 'sql:draft', questionId: current.id, sql: answer.sql });
    } else {
      if (!answer.option) return;
      correct = gradeChoice(current, answer.option);
    }

    dispatch({
      type: 'sql:answer',
      questionId: current.id,
      correct,
      ms: Date.now() - shownAt.current,
    });
    setRevealed((r) => ({ ...r, [current.id]: true }));
  }, [answerFor, current, dispatch, revealed]);

  const answeredCount = Object.keys(revealed).length;
  const correctCount = useMemo(
    () =>
      Object.keys(revealed).filter((id) => {
        const q = questions.find((x) => x.id === id);
        if (!q) return false;
        if (isExecutable(q)) return Boolean(grades[id]?.correct);
        return answers[id]?.option === q.answer;
      }).length,
    [revealed, answers, grades, questions]
  );

  // Keyboard shortcuts, suppressed while the editor has focus so typing SQL
  // never selects an option by accident.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || finished) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const letters: Record<string, 'a' | 'b' | 'c' | 'd'> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
      const picked = letters[e.key];
      if (picked && !revealed[current.id] && !isExecutable(current)) {
        e.preventDefault();
        setAnswers((a) => ({ ...a, [current.id]: { ...answerFor(current), option: picked } }));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!revealed[current.id]) submit();
        else if (index < questions.length - 1) setIndex((i) => i + 1);
        else setFinished(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [answerFor, current, finished, index, questions.length, revealed, submit]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink to={backTo} label={backLabel} />
        <EmptyState
          icon={<Database size={20} />}
          title="Nothing to practise here"
          body={emptyBody}
          action={
            <ButtonLink to="/sql" size="sm">
              Back to the SQL dashboard
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (finished || !current) {
    const accuracy = answeredCount === 0 ? 0 : (correctCount / answeredCount) * 100;
    return (
      <div className="flex flex-col gap-6">
        <BackLink to={backTo} label={backLabel} />
        <Card className="p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-ok" />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-fg md:text-2xl">
            Practice session complete
          </h1>
          <p className="mt-1 text-sm text-fg-muted">{title}</p>

          <div className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Answered"
              value={`${answeredCount}/${questions.length}`}
              icon={<Target size={16} />}
            />
            <StatCard
              label="Accuracy"
              value={answeredCount === 0 ? '--' : pct(accuracy)}
              sub={`${correctCount} correct`}
              icon={<CheckCircle2 size={16} />}
              tone="ok"
            />
            <StatCard
              label="Time"
              value={formatDuration(sessionMs)}
              sub={
                answeredCount === 0
                  ? undefined
                  : `~${formatDuration(sessionMs / answeredCount)} per question`
              }
              icon={<Timer size={16} />}
              tone="info"
            />
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                setIndex(0);
                setAnswers({});
                setGrades({});
                setRevealed({});
                setHints({});
                setFinished(false);
                sessionStart.current = Date.now();
                setSessionMs(0);
              }}
            >
              <RotateCcw size={15} />
              Practise again
            </Button>
            <ButtonLink to={backTo}>{backLabel}</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const isRevealed = Boolean(revealed[current.id]);
  const answer = answerFor(current);
  const isLast = index === questions.length - 1;
  const canSubmit = isExecutable(current) ? Boolean(answer.sql?.trim()) : Boolean(answer.option);

  return (
    <div className="flex flex-col gap-5">
      <BackLink to={backTo} label={backLabel} />

      <div>
        <h1 className="text-xl font-bold tracking-tight text-fg md:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      </div>

      <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <span className="text-sm font-medium text-fg">
          Question {index + 1}
          <span className="text-fg-faint"> / {questions.length}</span>
        </span>
        <Pill>
          <Target size={12} />
          {answeredCount === 0
            ? 'no answers yet'
            : `${pct((correctCount / answeredCount) * 100)} accuracy`}
        </Pill>
        <Pill>
          <CheckCircle2 size={12} className="text-ok" />
          {correctCount} correct
        </Pill>
        <Pill>
          <XCircle size={12} className="text-bad" />
          {answeredCount - correctCount} wrong
        </Pill>
        <Pill>
          <Timer size={12} />
          {formatDuration(sessionMs)}
        </Pill>
      </Card>

      <ProgressBar value={((index + 1) / questions.length) * 100} label="Session progress" />

      <Card className="p-5 md:p-6">
        <SqlQuestionView
          question={current}
          answer={answer}
          onAnswer={(next) => {
            setAnswers((a) => ({ ...a, [current.id]: next }));
            if (next.sql !== undefined) {
              dispatch({ type: 'sql:draft', questionId: current.id, sql: next.sql });
            }
          }}
          revealed={isRevealed}
          grade={grades[current.id] ?? null}
          flagged={data.sql.flagged.includes(current.id)}
          onToggleFlag={() => dispatch({ type: 'sql:flag', questionId: current.id })}
          hintsShown={hints[current.id] ?? 0}
          onShowHint={() => setHints((h) => ({ ...h, [current.id]: (h[current.id] ?? 0) + 1 }))}
          hintsEnabled={data.settings.hintsEnabled}
        />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ArrowLeft size={15} />
          Previous
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          {!isRevealed ? (
            <Button onClick={submit} disabled={!canSubmit}>
              Submit answer
            </Button>
          ) : isLast ? (
            <Button onClick={() => setFinished(true)}>
              Finish session
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)}>
              Next question
              <ArrowRight size={15} />
            </Button>
          )}
          {!isRevealed && !isLast && (
            <Button variant="ghost" onClick={() => setIndex((i) => i + 1)}>
              Skip
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-fg-faint">
        Shortcuts: <kbd className="font-mono">1</kbd>-<kbd className="font-mono">4</kbd> pick an
        option, <kbd className="font-mono">Enter</kbd> submits or advances,{' '}
        <kbd className="font-mono">Ctrl</kbd>/<kbd className="font-mono">⌘</kbd>+
        <kbd className="font-mono">Enter</kbd> runs a query.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- by topic */

export function SqlTopicPractice() {
  const { topicId } = useParams();
  const [params] = useSearchParams();
  const { data } = useApp();

  const topic = topicId ? getSqlTopic(topicId) : undefined;
  if (!topic) return <NotFound />;

  const filter = (params.get('only') ?? 'all') as SqlPracticeFilter;
  const all = sqlQuestionsForTopic(topic.id);

  const questions = all.filter((q) => {
    const stat = data.sql.questionStats[q.id];
    if (filter === 'mistakes') return Boolean(stat && stat.attempts > 0 && !stat.lastCorrect);
    if (filter === 'flagged') return data.sql.flagged.includes(q.id);
    if (filter === 'unattempted') return !stat || stat.attempts === 0;
    if (filter === 'exercises') return isExecutable(q);
    return true;
  });

  const progress = sqlTopicProgress(data, topic);

  return (
    <div className="flex flex-col gap-5">
      <SqlPracticeSession
        questions={questions}
        title={topic.name}
        subtitle={`SQL Level ${topic.levelId} practice · ${FILTER_LABEL[filter]} · ${progress.attempted}/${progress.questionCount} attempted overall`}
        backTo={'/sql/topic/' + topic.id}
        backLabel={'Back to ' + topic.name}
        emptyBody={
          filter === 'all'
            ? 'This topic has no questions yet.'
            : 'No questions in this topic match that filter right now. Try practising all questions instead.'
        }
      />

      <Card className="p-4">
        <span className="label">Practise a subset</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {(['all', 'exercises', 'mistakes', 'flagged', 'unattempted'] as SqlPracticeFilter[]).map(
            (f) => (
              <ButtonLink
                key={f}
                to={`/sql/practice/${topic.id}${f === 'all' ? '' : '?only=' + f}`}
                variant={filter === f ? 'primary' : 'secondary'}
                size="sm"
              >
                {FILTER_LABEL[f]}
              </ButtonLink>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------- review modes */

export function SqlReview() {
  const [params] = useSearchParams();
  const { data } = useApp();
  const mode = params.get('filter') ?? 'mistakes';

  const questions = useMemo(() => {
    if (mode === 'flagged') return sqlFlaggedQuestions(data);
    if (mode === 'repeated') return sqlRepeatedMistakes(data);
    return sqlMistakeQuestions(data);
  }, [data, mode]);

  const title =
    mode === 'flagged'
      ? 'Flagged questions'
      : mode === 'repeated'
        ? 'Repeatedly wrong'
        : 'Mistake review';

  const subtitle =
    mode === 'flagged'
      ? 'Questions you marked as difficult, across every SQL level.'
      : mode === 'repeated'
        ? 'Questions you have now got wrong twice or more. These are the ones worth slowing down on.'
        : 'Questions you answered incorrectly on your most recent attempt. Getting one right here clears it from the list.';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/sql/review" variant={mode === 'mistakes' ? 'primary' : 'secondary'} size="sm">
          <RotateCcw size={14} />
          My mistakes ({sqlMistakeQuestions(data).length})
        </ButtonLink>
        <ButtonLink
          to="/sql/review?filter=repeated"
          variant={mode === 'repeated' ? 'primary' : 'secondary'}
          size="sm"
        >
          <XCircle size={14} />
          Repeatedly wrong ({sqlRepeatedMistakes(data).length})
        </ButtonLink>
        <ButtonLink
          to="/sql/review?filter=flagged"
          variant={mode === 'flagged' ? 'primary' : 'secondary'}
          size="sm"
        >
          <Flag size={14} />
          Flagged ({data.sql.flagged.length})
        </ButtonLink>
      </div>

      <SqlPracticeSession
        questions={questions}
        title={title}
        subtitle={subtitle}
        backTo="/sql"
        backLabel="Back to the SQL dashboard"
        emptyBody={
          mode === 'flagged'
            ? 'You have not flagged any SQL questions. Use the flag button while practising to collect the tricky ones here.'
            : mode === 'repeated'
              ? 'Nothing has gone wrong twice yet. This list fills up only with questions you have missed more than once.'
              : 'No outstanding mistakes. Either you have not answered anything yet, or you have cleared everything you previously got wrong.'
        }
      />
    </div>
  );
}

/* ------------------------------------------------------ tag-based practice */

/** Shared by the JOIN lab and the combination-practice page. */
export function SqlTagPractice({
  tags,
  title,
  subtitle,
  backTo,
  backLabel,
}: {
  tags: string[];
  title: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
}) {
  const questions = useMemo(() => sqlQuestionsForTags(tags), [tags]);
  return (
    <SqlPracticeSession
      questions={questions}
      title={title}
      subtitle={subtitle}
      backTo={backTo}
      backLabel={backLabel}
      emptyBody="No questions are tagged for this set yet."
    />
  );
}
