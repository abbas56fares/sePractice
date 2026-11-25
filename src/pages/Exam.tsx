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
  Timer,
  Trophy,
} from 'lucide-react';
import type { ActiveExam } from '../types';
import { useApp } from '../state/AppContext';
import { LEVELS, TOPIC_BY_ID } from '../data/levels';
import { getQuestions } from '../data/questions';
import { availableQuestionCount, createExam, remainingMs } from '../lib/exam';
import { isFinalUnlocked, isLevelUnlocked, topicProgress } from '../lib/progress';
import { formatClock } from '../lib/format';
import { QuestionView } from '../components/QuestionView';
import { Button, ButtonLink, Card, EmptyState, Pill, SectionHeading } from '../components/ui';
import { Modal } from '../components/ui/Modal';
import { NotFound } from './NotFound';

/* ------------------------------------------------------------------ chooser */

export function ExamChooser() {
  const { data } = useApp();

  if (data.activeExam) return <Navigate to="/exam" replace />;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Timed exams</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Exams simulate a real technical screen: a countdown, one question at a time, no feedback
          until you submit. Level finals default to {data.settings.finalExamQuestions} questions in{' '}
          {data.settings.finalExamMinutes} minutes. Both are configurable in Settings.
        </p>
      </div>

      {LEVELS.map((level) => {
        const unlocked = isLevelUnlocked(data, level.id);
        const finalUnlocked = isFinalUnlocked(data, level.id);

        return (
          <section key={level.id}>
            <SectionHeading
              title={`Level ${level.id} · ${level.name}`}
              icon={<Timer size={18} />}
              description={
                unlocked
                  ? 'Topic exams are short and focused; the final draws from every topic in the level.'
                  : `Locked. Score ${data.settings.passThresholdPct}% on the Level ${level.id - 1} final to unlock.`
              }
            />
            <Card className="divide-y divide-hairline">
              {level.topics.map((topic) => {
                const progress = topicProgress(data, topic);
                const count = topic.isFinal
                  ? Math.min(data.settings.finalExamQuestions, availableQuestionCount(level.id, null))
                  : Math.min(
                      data.settings.topicExamQuestions,
                      availableQuestionCount(level.id, topic.id)
                    );
                const minutes = topic.isFinal
                  ? data.settings.finalExamMinutes
                  : data.settings.topicExamMinutes;
                const usable = topic.isFinal ? finalUnlocked : unlocked;

                return (
                  <div
                    key={topic.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {topic.isFinal && <Trophy size={14} className="shrink-0 text-accent-text" />}
                        <span className="truncate text-sm font-medium text-fg">{topic.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
                        <span>
                          {count} questions &middot; {minutes} min
                        </span>
                        <span>
                          Best {progress.bestScorePct > 0 ? progress.bestScorePct + '%' : '--'}
                        </span>
                        {progress.attemptCount > 0 && (
                          <span>
                            {progress.attemptCount} attempt
                            {progress.attemptCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                    {usable ? (
                      <ButtonLink
                        to={'/exam/start/' + topic.id}
                        variant={topic.isFinal ? 'primary' : 'secondary'}
                        size="sm"
                        className="shrink-0"
                      >
                        Start exam
                      </ButtonLink>
                    ) : (
                      <Pill className="shrink-0">Locked</Pill>
                    )}
                  </div>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- start / brief */

export function ExamStart() {
  const { topicId } = useParams();
  const { data, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [replaceOpen, setReplaceOpen] = useState(false);

  const topic = topicId ? TOPIC_BY_ID.get(topicId) : undefined;
  if (!topic) return <NotFound />;

  const isFinal = Boolean(topic.isFinal);
  const requestedCount = isFinal
    ? data.settings.finalExamQuestions
    : data.settings.topicExamQuestions;
  const minutes = isFinal ? data.settings.finalExamMinutes : data.settings.topicExamMinutes;
  const pool = availableQuestionCount(topic.level, isFinal ? null : topic.id);
  const count = Math.min(requestedCount, pool);

  const unlocked = isFinal ? isFinalUnlocked(data, topic.level) : isLevelUnlocked(data, topic.level);

  const begin = () => {
    const exam = createExam({
      level: topic.level,
      topicId: isFinal ? null : topic.id,
      kind: isFinal ? 'final' : 'topic',
      questionCount: count,
      durationMinutes: minutes,
      shuffle: data.settings.shuffleQuestions,
    });
    dispatch({ type: 'exam:start', exam });
    navigate('/exam', { replace: true });
  };

  const onStartClick = () => {
    if (data.activeExam) setReplaceOpen(true);
    else begin();
  };

  if (!unlocked) {
    const progress = topicProgress(data, topic);
    return (
      <div className="flex flex-col gap-6">
        <Link
          to={'/level/' + topic.level}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={15} />
          Back to Level {topic.level}
        </Link>
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="This exam is locked"
          body={progress.lockReason ?? 'Complete the prerequisites first.'}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink to={'/level/' + topic.level} variant="secondary" size="sm">
                Open the level
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
      <Link
        to={'/level/' + topic.level}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back to Level {topic.level}
      </Link>

      <Card className="p-5 md:p-6">
        <span className="label">Level {topic.level} {isFinal ? 'final exam' : 'topic exam'}</span>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">{topic.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{topic.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-hairline py-5 sm:grid-cols-4">
          <div>
            <dt className="label">Questions</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{count}</dd>
          </div>
          <div>
            <dt className="label">Time limit</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{minutes} min</dd>
          </div>
          <div>
            <dt className="label">Per question</dt>
            <dd className="mt-1 text-lg font-bold text-fg">
              ~{count === 0 ? 0 : Math.round((minutes * 60) / count)}s
            </dd>
          </div>
          <div>
            <dt className="label">Pass mark</dt>
            <dd className="mt-1 text-lg font-bold text-fg">{data.settings.passThresholdPct}%</dd>
          </div>
        </dl>

        <ul className="mt-5 flex flex-col gap-2 text-sm text-fg-muted">
          {[
            'One question at a time, four options, exactly one correct answer.',
            'Answers save as you go. Refreshing or navigating away does not reset the clock or lose your work.',
            'No feedback is shown until you submit, so flag anything you want to revisit.',
            'The exam submits itself automatically when the timer reaches zero.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {count < requestedCount && (
          <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-fg-soft">
            This pool holds {pool} questions, so the exam will use {count} rather than the{' '}
            {requestedCount} configured in Settings.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <ButtonLink to={'/level/' + topic.level} variant="secondary">
            Cancel
          </ButtonLink>
          <Button onClick={onStartClick} disabled={count === 0}>
            <Timer size={15} />
            Begin exam
          </Button>
        </div>
      </Card>

      <Modal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="An exam is already in progress"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReplaceOpen(false)}>
              Keep the current exam
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'exam:abandon' });
                notify('Previous exam discarded.', 'info');
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

/* ------------------------------------------------------------------- runner */

export function ExamRunner() {
  const { data } = useApp();
  if (!data.activeExam) return <ExamChooser />;
  // Keyed on the exam id so all local runner state resets for a new attempt.
  return <ActiveExamView key={data.activeExam.id} exam={data.activeExam} />;
}

function ActiveExamView({ exam }: { exam: ActiveExam }) {
  const { data, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);

  const questions = useMemo(() => getQuestions(exam.questionIds), [exam.questionIds]);
  const index = Math.min(exam.currentIndex, Math.max(0, questions.length - 1));
  const current = questions[index];

  /* -------- clock. Derived from the persisted deadline, never accumulated, so
     navigating between questions or refreshing the page cannot drift it. ---- */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingMs(exam, now);
  const warnMs = data.settings.timerWarningMinutes * 60_000;
  const nearlyUp = left > 0 && left <= warnMs;

  /* -------- per-question dwell time. Declared before submit(), which reads
     it when crediting the final question. ------------------------------- */
  const shownAt = useRef(0);
  // Declared before every effect that reads it, so it is seeded first.
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const submit = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      const id = exam.id;
      if (current) {
        dispatch({ type: 'exam:accrue', questionId: current.id, ms: Date.now() - shownAt.current });
      }
      dispatch({ type: 'exam:submit', auto });
      notify(auto ? 'Time expired — your exam was submitted automatically.' : 'Exam submitted.', auto ? 'info' : 'success');
      navigate('/results/' + id, { replace: true });
    },
    [current, dispatch, exam.id, navigate, notify]
  );

  // Auto-submit the moment the deadline passes — including a deadline that
  // already passed while the tab was closed, which is checked on first render.
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
        dispatch({ type: 'exam:accrue', questionId: current.id, ms: Date.now() - shownAt.current });
      }
      shownAt.current = Date.now();
      dispatch({ type: 'exam:goto', index: nextIndex });
    },
    [current, dispatch]
  );

  // Credit time spent on the visible question if the tab is closed mid-exam.
  useEffect(() => {
    const onHide = () => {
      if (current) {
        dispatch({ type: 'exam:accrue', questionId: current.id, ms: Date.now() - shownAt.current });
        shownAt.current = Date.now();
      }
    };
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, [current, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!current) return;

      const letters: Record<string, 'a' | 'b' | 'c' | 'd'> = {
        '1': 'a',
        '2': 'b',
        '3': 'c',
        '4': 'd',
      };
      const picked = letters[e.key];
      if (picked) {
        e.preventDefault();
        dispatch({ type: 'exam:answer', questionId: current.id, option: picked });
      } else if (e.key === 'ArrowRight' && index < questions.length - 1) {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        dispatch({ type: 'exam:flag', questionId: current.id });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, dispatch, goTo, index, questions.length]);

  if (questions.length === 0 || !current) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="This exam has no questions"
        body="Something went wrong building the paper. Discard it and start another."
        action={
          <Button variant="danger" onClick={() => dispatch({ type: 'exam:abandon' })}>
            Discard exam
          </Button>
        }
      />
    );
  }

  const answeredCount = exam.questionIds.filter((id) => exam.answers[id]).length;
  const unanswered = exam.questionIds.length - answeredCount;
  const label =
    exam.kind === 'final'
      ? `Level ${exam.level} final exam`
      : (TOPIC_BY_ID.get(exam.topicId ?? '')?.name ?? 'Topic exam');

  return (
    <div className="flex flex-col gap-5">
      {/* Clock bar. Sticky so the countdown is visible while reading a snippet. */}
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
                (nearlyUp
                  ? 'border-bad/40 bg-bad/10 text-bad'
                  : 'border-hairline bg-raised text-fg')
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
        <QuestionView
          question={current}
          selected={exam.answers[current.id]}
          onSelect={(option) =>
            dispatch({ type: 'exam:answer', questionId: current.id, option })
          }
          revealed={false}
          flagged={exam.flagged.includes(current.id)}
          onToggleFlag={() => dispatch({ type: 'exam:flag', questionId: current.id })}
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

      <Navigator exam={exam} index={index} onJump={goTo} />

      <p className="text-center text-xs text-fg-faint">
        Shortcuts: <kbd className="font-mono">1</kbd>-<kbd className="font-mono">4</kbd> answer,{' '}
        <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> navigate,{' '}
        <kbd className="font-mono">F</kbd> flag.
      </p>

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
            penalty for guessing, so it is always worth picking something.
          </p>
        )}
        {exam.flagged.length > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            You still have {exam.flagged.length} question
            {exam.flagged.length === 1 ? '' : 's'} flagged for review.
          </p>
        )}
        <p className="mt-4 text-sm text-fg-muted">
          Once submitted, your score and full explanations are shown immediately, and this attempt
          is added to your exam history.
        </p>
      </Modal>
    </div>
  );
}

/** Question-number grid with answered / unanswered / flagged / current states. */
function Navigator({
  exam,
  index,
  onJump,
}: {
  exam: ActiveExam;
  index: number;
  onJump: (i: number) => void;
}) {
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
          const answered = Boolean(exam.answers[id]);
          const flagged = exam.flagged.includes(id);
          const isCurrent = i === index;

          let cls = 'border-edge bg-raised text-fg-muted hover:bg-hairline';
          if (flagged) cls = 'border-warn bg-warn/20 text-warn hover:bg-warn/30';
          else if (answered) cls = 'border-accent bg-accent/20 text-accent-text hover:bg-accent/30';

          return (
            <button
              key={id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${answered ? ', answered' : ', unanswered'}${flagged ? ', flagged' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={
                'relative flex h-11 items-center justify-center rounded-lg border font-mono text-xs font-semibold ' +
                cls +
                (isCurrent ? ' ring-2 ring-accent ring-offset-2 ring-offset-surface' : '')
              }
            >
              {i + 1}
              {flagged && <Flag size={8} className="absolute right-1 top-1" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
