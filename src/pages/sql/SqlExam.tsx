import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Flag,
  Send,
  Terminal,
  Timer,
} from 'lucide-react';
import type { SqlActiveExam, SqlExamConfig } from '../../types/sql';
import { isExecutable } from '../../types/sql';
import { useApp } from '../../state/AppContext';
import { getSqlTopic } from '../../data/sql/levels';
import { getSqlExamConfig } from '../../data/sql/exams';
import { getSqlQuestions } from '../../data/sql/questions';
import {
  availableForConfig,
  buildSqlExam,
  sqlRemainingMs,
  topicExamConfig,
} from '../../lib/sql-exam';
import { isSqlFinalUnlocked, isSqlLevelUnlocked } from '../../lib/sql-progress';
import { formatClock } from '../../lib/format';
import { SqlQuestionView } from '../../components/sql/SqlQuestionView';
import { Button, ButtonLink, Card, EmptyState, Pill } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { SqlTests } from './SqlTests';
import { NotFound } from '../NotFound';

/* ------------------------------------------------------------- start page */

function StartBrief({ config, backTo }: { config: SqlExamConfig; backTo: string }) {
  const { data, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [replaceOpen, setReplaceOpen] = useState(false);

  const count = availableForConfig(config);

  const unlocked =
    config.kind === 'topic'
      ? isSqlLevelUnlocked(data, config.levelId ?? 1)
      : config.kind === 'mock'
        ? true
        : config.levelId === null
          ? data.settings.unlockMode === 'open' ||
            [1, 2, 3].every(
              (l) => isSqlFinalUnlocked(data, l as 1 | 2 | 3)
            )
          : isSqlFinalUnlocked(data, config.levelId);

  const begin = () => {
    dispatch({ type: 'sql:exam:start', exam: buildSqlExam(config) });
    navigate('/sql/exam', { replace: true });
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-6">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft size={15} />
          Back
        </Link>
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="This exam is locked"
          body={
            config.levelId === null
              ? 'Pass all three level finals to unlock the comprehensive paper, or switch to open mode in Settings.'
              : `Average ${data.settings.passThresholdPct}% or more across the Level ${config.levelId} topic exams to unlock this exam, or switch to open mode in Settings.`
          }
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink to={backTo} variant="secondary" size="sm">
                Go back
              </ButtonLink>
              <ButtonLink to="/settings" size="sm">
                Change progression rules
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back
      </Link>

      <Card className="p-5 md:p-6">
        <span className="label">
          SQL {config.kind === 'final' ? 'final exam' : config.kind === 'mock' ? 'mock test' : 'topic exam'}
        </span>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">{config.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{config.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-hairline py-5 sm:grid-cols-4">
          <div>
            <dt className="label">Questions</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{count}</dd>
          </div>
          <div>
            <dt className="label">Time limit</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{config.durationMinutes} min</dd>
          </div>
          <div>
            <dt className="label">Per question</dt>
            <dd className="mt-1 text-lg font-bold text-fg">
              ~{count === 0 ? 0 : Math.round((config.durationMinutes * 60) / count)}s
            </dd>
          </div>
          <div>
            <dt className="label">Pass mark</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{config.passPct}%</dd>
          </div>
        </dl>

        <ul className="mt-5 flex flex-col gap-2 text-sm text-fg-muted">
          {[
            'A mixture of multiple-choice questions and query-writing exercises.',
            'You can run a query to check your own work — the expected result stays hidden until you submit.',
            'Answers save as you go. Refreshing or navigating away does not reset the clock or lose your work.',
            'The exam submits itself automatically when the timer reaches zero.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {count < config.questionCount && (
          <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-fg-soft">
            The pool for this paper holds {count} questions, so it will use {count} rather than the{' '}
            {config.questionCount} configured.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <ButtonLink to={backTo} variant="secondary">
            Cancel
          </ButtonLink>
          <Button
            onClick={() => (data.sql.activeExam ? setReplaceOpen(true) : begin())}
            disabled={count === 0}
          >
            <Timer size={15} />
            Begin exam
          </Button>
        </div>
      </Card>

      <Modal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="A SQL exam is already in progress"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReplaceOpen(false)}>
              Keep the current exam
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'sql:exam:abandon' });
                notify('Previous SQL exam discarded.', 'info');
                setReplaceOpen(false);
                begin();
              }}
            >
              Discard it and start fresh
            </Button>
          </>
        }
      >
        <p>
          Starting this exam will discard the one you have in progress, including its answers and
          remaining time. That attempt will not be recorded in your history.
        </p>
      </Modal>
    </div>
  );
}

export function SqlExamStart() {
  const { configId } = useParams();
  const { data } = useApp();
  const config = configId ? getSqlExamConfig(configId) : undefined;
  if (!config) return <NotFound />;
  void data;
  return <StartBrief config={config} backTo="/sql/tests" />;
}

export function SqlTopicExamStart() {
  const { topicId } = useParams();
  const { data } = useApp();
  const topic = topicId ? getSqlTopic(topicId) : undefined;
  if (!topic) return <NotFound />;
  return <StartBrief config={topicExamConfig(topic, data.settings)} backTo={'/sql/topic/' + topic.id} />;
}

/* ----------------------------------------------------------------- runner */

export function SqlExamRunner() {
  const { data } = useApp();
  if (!data.sql.activeExam) return <SqlTests />;
  // Keyed on the exam id so all local runner state resets for a new attempt.
  return <ActiveSqlExamView key={data.sql.activeExam.id} exam={data.sql.activeExam} />;
}

function ActiveSqlExamView({ exam }: { exam: SqlActiveExam }) {
  const { data, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);

  const questions = useMemo(() => getSqlQuestions(exam.questionIds), [exam.questionIds]);
  const index = Math.min(exam.currentIndex, Math.max(0, questions.length - 1));
  const current = questions[index];

  const config = getSqlExamConfig(exam.configId);
  const passPct = config?.passPct ?? data.settings.passThresholdPct;

  /* Clock derived from the persisted deadline, never accumulated. */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const left = sqlRemainingMs(exam, now);
  const warnMs = data.settings.timerWarningMinutes * 60_000;
  const nearlyUp = left > 0 && left <= warnMs;

  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const submit = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      const id = exam.id;
      if (current) {
        dispatch({
          type: 'sql:exam:accrue',
          questionId: current.id,
          ms: Date.now() - shownAt.current,
        });
      }
      dispatch({ type: 'sql:exam:submit', auto, passPct });
      notify(
        auto ? 'Time expired — your exam was submitted automatically.' : 'Exam submitted.',
        auto ? 'info' : 'success'
      );
      navigate('/sql/results/' + id, { replace: true });
    },
    [current, dispatch, exam.id, navigate, notify, passPct]
  );

  // Auto-submit the moment the deadline passes, including one that already
  // passed while the tab was closed.
  useEffect(() => {
    if (left <= 0) submit(true);
  }, [left, submit]);

  const warned = useRef(false);
  useEffect(() => {
    if (nearlyUp && !warned.current) {
      warned.current = true;
      notify(
        `${data.settings.timerWarningMinutes} minutes remaining. Unanswered questions score zero, so make a choice on anything still blank.`,
        'error'
      );
    }
  }, [nearlyUp, notify, data.settings.timerWarningMinutes]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (current) {
        dispatch({
          type: 'sql:exam:accrue',
          questionId: current.id,
          ms: Date.now() - shownAt.current,
        });
      }
      shownAt.current = Date.now();
      dispatch({ type: 'sql:exam:goto', index: nextIndex });
    },
    [current, dispatch]
  );

  // Credit time spent on the visible question if the tab is closed mid-exam.
  useEffect(() => {
    const onHide = () => {
      if (current) {
        dispatch({
          type: 'sql:exam:accrue',
          questionId: current.id,
          ms: Date.now() - shownAt.current,
        });
        shownAt.current = Date.now();
      }
    };
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, [current, dispatch]);

  if (questions.length === 0 || !current) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="This exam has no questions"
        body="Something went wrong building the paper. Discard it and start another."
        action={
          <Button variant="danger" onClick={() => dispatch({ type: 'sql:exam:abandon' })}>
            Discard exam
          </Button>
        }
      />
    );
  }

  const isAnswered = (id: string) =>
    exam.answers[id] !== undefined || Boolean(exam.queries[id]?.trim());
  const answeredCount = exam.questionIds.filter(isAnswered).length;
  const unanswered = exam.questionIds.length - answeredCount;

  const label =
    config?.name ??
    (exam.topicId ? (getSqlTopic(exam.topicId)?.name ?? 'SQL exam') : 'SQL exam');

  return (
    <div className="flex flex-col gap-5">
      {/* Clock bar, sticky so the countdown stays visible while reading. */}
      <div className="sticky top-[57px] z-20 -mx-4 border-b border-hairline bg-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="label">{label}</span>
            <p className="text-sm font-medium text-fg">
              Question {index + 1}
              <span className="text-fg-faint"> of {questions.length}</span>
              <span className="text-fg-faint"> &middot; {answeredCount} answered</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={
                'flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-base font-semibold tabular-nums ' +
                (nearlyUp ? 'border-bad/40 bg-bad/10 text-bad' : 'border-hairline bg-raised text-fg')
              }
              role="timer"
              aria-live="off"
            >
              <Timer size={16} className={nearlyUp ? 'animate-pulse' : ''} />
              {formatClock(left)}
            </div>
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              <Send size={14} />
              Submit
            </Button>
          </div>
        </div>

        {nearlyUp && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-bad">
            <AlertTriangle size={13} />
            Less than {data.settings.timerWarningMinutes} minutes left &mdash; {unanswered}{' '}
            unanswered.
          </p>
        )}
      </div>

      <Card className="p-5 md:p-6">
        {/* revealed is hard-wired false: the exam never shows an answer. */}
        <SqlQuestionView
          question={current}
          answer={{
            ...(exam.answers[current.id] !== undefined
              ? { option: exam.answers[current.id] }
              : {}),
            ...(isExecutable(current)
              ? { sql: exam.queries[current.id] ?? current.starter ?? '' }
              : {}),
          }}
          onAnswer={(next) => {
            if (next.option !== undefined) {
              dispatch({
                type: 'sql:exam:answer',
                questionId: current.id,
                option: next.option,
              });
            }
            if (next.sql !== undefined) {
              dispatch({ type: 'sql:exam:query', questionId: current.id, sql: next.sql });
            }
          }}
          revealed={false}
          flagged={exam.flagged.includes(current.id)}
          onToggleFlag={() => dispatch({ type: 'sql:exam:flag', questionId: current.id })}
          hintsEnabled={false}
        />
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ArrowLeft size={15} />
          Previous
        </Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => goTo(index + 1)}>
            Next
            <ArrowRight size={15} />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)}>
            Review &amp; submit
            <ArrowRight size={15} />
          </Button>
        )}
      </div>

      <Navigator exam={exam} index={index} onJump={goTo} isAnswered={isAnswered} />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit this exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button onClick={() => submit(false)}>
              <Send size={15} />
              Submit exam
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="label">Answered</dt>
            <dd className="mt-1 text-xl font-bold text-ok">{answeredCount}</dd>
          </div>
          <div>
            <dt className="label">Unanswered</dt>
            <dd className={'mt-1 text-xl font-bold ' + (unanswered > 0 ? 'text-bad' : 'text-fg')}>
              {unanswered}
            </dd>
          </div>
          <div>
            <dt className="label">Flagged</dt>
            <dd className="mt-1 text-xl font-bold text-warn">{exam.flagged.length}</dd>
          </div>
          <div>
            <dt className="label">Time left</dt>
            <dd className="mt-1 font-mono text-xl font-bold text-fg">{formatClock(left)}</dd>
          </div>
        </dl>

        {unanswered > 0 && (
          <p className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm text-fg-soft">
            {unanswered} question{unanswered === 1 ? '' : 's'} will be marked incorrect. There is no
            penalty for guessing, so it is always worth attempting something.
          </p>
        )}
        {exam.flagged.length > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            You still have {exam.flagged.length} question
            {exam.flagged.length === 1 ? '' : 's'} flagged for review.
          </p>
        )}
        <p className="mt-4 text-sm text-fg-muted">
          Your query-writing answers are run and marked at submission, so your score reflects what
          the queries actually return.
        </p>
      </Modal>
    </div>
  );
}

/** Question-number grid, with executable questions marked. */
function Navigator({
  exam,
  index,
  onJump,
  isAnswered,
}: {
  exam: SqlActiveExam;
  index: number;
  onJump: (i: number) => void;
  isAnswered: (id: string) => boolean;
}) {
  const questions = getSqlQuestions(exam.questionIds);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="label">Question navigator</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-accent bg-accent/20" />
            answered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-edge bg-raised" />
            unanswered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-warn bg-warn/20" />
            flagged
          </span>
          <span className="flex items-center gap-1.5">
            <Terminal size={11} className="text-fg-faint" />
            write a query
          </span>
          <span className="flex items-center gap-1.5">
            <CircleDot size={12} className="text-accent-text" />
            current
          </span>
        </div>
      </div>

      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}
      >
        {exam.questionIds.map((id, i) => {
          const answered = isAnswered(id);
          const flagged = exam.flagged.includes(id);
          const isCurrent = i === index;
          const q = questions[i];
          const writes = q ? isExecutable(q) : false;

          let cls = 'border-edge bg-raised text-fg-muted hover:bg-hairline';
          if (flagged) cls = 'border-warn bg-warn/20 text-warn hover:bg-warn/30';
          else if (answered) cls = 'border-accent bg-accent/20 text-accent-text hover:bg-accent/30';

          return (
            <button
              key={id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${answered ? ', answered' : ', unanswered'}${flagged ? ', flagged' : ''}${writes ? ', write a query' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={
                'relative flex h-11 items-center justify-center rounded-lg border font-mono text-xs font-semibold ' +
                cls +
                (isCurrent ? ' ring-2 ring-accent ring-offset-2 ring-offset-surface' : '')
              }
            >
              {i + 1}
              {flagged && <Flag size={8} className="absolute right-1 top-1" />}
              {writes && !flagged && <Terminal size={8} className="absolute right-1 top-1 opacity-60" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Redirects a stale /sql/exam visit with no active exam to the test list. */
export function SqlExamGuard() {
  const { data } = useApp();
  return data.sql.activeExam ? <SqlExamRunner /> : <Navigate to="/sql/tests" replace />;
}

export { Pill };
