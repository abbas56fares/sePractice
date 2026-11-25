import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coffee,
  Flag,
  RotateCcw,
  Target,
  Timer,
  XCircle,
} from 'lucide-react';
import type { OptionId, Question } from '../types';
import { useApp } from '../state/AppContext';
import { LEVELS, TOPIC_BY_ID } from '../data/levels';
import { questionsForTopic } from '../data/questions';
import { mistakeQuestions, flaggedQuestions } from '../lib/analytics';
import { topicProgress } from '../lib/progress';
import { formatDuration, pct } from '../lib/format';
import { QuestionView } from '../components/QuestionView';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  SectionHeading,
  StatCard,
} from '../components/ui';
import { NotFound } from './NotFound';

export type PracticeFilter = 'all' | 'mistakes' | 'flagged' | 'unattempted';

const FILTER_LABEL: Record<PracticeFilter, string> = {
  all: 'All questions',
  mistakes: 'Only my incorrect answers',
  flagged: 'Only flagged questions',
  unattempted: 'Only questions I have not tried',
};

/**
 * The practice engine. Deliberately separate from the exam engine: it reveals
 * the answer on submission, explains every distractor, offers hints and keeps
 * no clock pressure. The exam does none of those things.
 */
export function PracticeSession({
  questions,
  title,
  subtitle,
  backTo,
  backLabel,
  emptyBody,
}: {
  questions: Question[];
  title: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
  emptyBody: string;
}) {
  const { data, dispatch } = useApp();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionId>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hinted, setHinted] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  // Time on the current question. Reset whenever the visible question changes,
  // so navigating back and forth does not inflate the recorded duration.
  // Seeded by the effect below on mount, so render stays free of Date.now().
  const shownAt = useRef(0);
  const current = questions[Math.min(index, Math.max(0, questions.length - 1))];

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

  const submit = useCallback(() => {
    if (!current) return;
    const given = answers[current.id];
    if (!given || revealed[current.id]) return;
    dispatch({
      type: 'practice:answer',
      questionId: current.id,
      correct: given === current.answer,
      ms: Date.now() - shownAt.current,
    });
    setRevealed((r) => ({ ...r, [current.id]: true }));
  }, [answers, current, dispatch, revealed]);

  const answeredCount = Object.keys(revealed).length;
  const correctCount = useMemo(
    () =>
      Object.keys(revealed).filter((id) => {
        const q = questions.find((x) => x.id === id);
        return q && answers[id] === q.answer;
      }).length,
    [revealed, answers, questions]
  );

  // Keyboard shortcuts: 1-4 pick an option, Enter submits or advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || finished) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const letters: Record<string, OptionId> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
      const picked = letters[e.key];
      if (picked && !revealed[current.id]) {
        e.preventDefault();
        setAnswers((a) => ({ ...a, [current.id]: picked }));
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
  }, [current, finished, index, questions.length, revealed, submit]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink to={backTo} label={backLabel} />
        <EmptyState
          icon={<Coffee size={20} />}
          title="Nothing to practise here"
          body={emptyBody}
          action={
            <ButtonLink to="/roadmap" size="sm">
              Open the roadmap
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
                setRevealed({});
                setHinted({});
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
  const selected = answers[current.id];
  const isLast = index === questions.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <BackLink to={backTo} label={backLabel} />

      <div>
        <h1 className="text-xl font-bold tracking-tight text-fg md:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      </div>

      {/* Live session stats: the practice-mode counterpart of the exam clock. */}
      <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <span className="text-sm font-medium text-fg">
          Question {index + 1}
          <span className="text-fg-faint"> / {questions.length}</span>
        </span>
        <Pill>
          <Target size={12} />
          {answeredCount === 0 ? 'no answers yet' : `${pct((correctCount / answeredCount) * 100)} accuracy`}
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
        <QuestionView
          question={current}
          selected={selected}
          onSelect={(option) => setAnswers((a) => ({ ...a, [current.id]: option }))}
          revealed={isRevealed}
          flagged={data.flagged.includes(current.id)}
          onToggleFlag={() => dispatch({ type: 'flag:toggle', questionId: current.id })}
          hintVisible={Boolean(hinted[current.id]) && data.settings.hintsEnabled}
          onShowHint={
            data.settings.hintsEnabled
              ? () => setHinted((h) => ({ ...h, [current.id]: true }))
              : undefined
          }
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
            <Button onClick={submit} disabled={!selected}>
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
        Shortcuts: press <kbd className="font-mono">1</kbd>-<kbd className="font-mono">4</kbd> to
        pick an option, <kbd className="font-mono">Enter</kbd> to submit or advance.
      </p>
    </div>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft size={15} />
      {label}
    </Link>
  );
}

/* ----------------------------------------------------------------- by topic */

export function TopicPractice() {
  const { topicId } = useParams();
  const [params] = useSearchParams();
  const { data } = useApp();

  const topic = topicId ? TOPIC_BY_ID.get(topicId) : undefined;
  if (!topic || topic.isFinal) return <NotFound />;

  const filter = (params.get('only') ?? 'all') as PracticeFilter;
  const all = questionsForTopic(topic.id);

  const questions = all.filter((q) => {
    const stat = data.questionStats[q.id];
    if (filter === 'mistakes') return Boolean(stat && stat.attempts > 0 && !stat.lastCorrect);
    if (filter === 'flagged') return data.flagged.includes(q.id);
    if (filter === 'unattempted') return !stat || stat.attempts === 0;
    return true;
  });

  const progress = topicProgress(data, topic);

  return (
    <div className="flex flex-col gap-5">
      <PracticeSession
        questions={questions}
        title={topic.name}
        subtitle={`Level ${topic.level} practice \u00b7 ${FILTER_LABEL[filter]} \u00b7 ${progress.attempted}/${progress.questionCount} attempted overall`}
        backTo={'/level/' + topic.level}
        backLabel={'Back to Level ' + topic.level}
        emptyBody={
          filter === 'all'
            ? 'This topic has no questions yet.'
            : 'No questions in this topic match that filter right now. Try practising all questions instead.'
        }
      />

      {/* Filters stay reachable at every width, below the session itself. */}
      <Card className="p-4">
        <span className="label">Practise a subset</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {(['all', 'mistakes', 'flagged', 'unattempted'] as PracticeFilter[]).map((f) => (
            <ButtonLink
              key={f}
              to={`/practice/${topic.id}${f === 'all' ? '' : '?only=' + f}`}
              variant={filter === f ? 'primary' : 'secondary'}
              size="sm"
            >
              {FILTER_LABEL[f]}
            </ButtonLink>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ chooser */

export function PracticeChooser() {
  const { data } = useApp();
  const mistakes = useMemo(() => mistakeQuestions(data), [data]);
  const flagged = useMemo(() => flaggedQuestions(data), [data]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Practice</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Untimed, one question at a time, with the answer and a rebuttal of every wrong option
          revealed as soon as you submit. Nothing here affects your exam scores.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
        <Card className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="label">Targeted</span>
              <h2 className="mt-0.5 text-base font-semibold text-fg">Re-attempt mistakes</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-bad/30 bg-bad/10 text-bad">
              <RotateCcw size={17} />
            </span>
          </div>
          <p className="mt-2 flex-1 text-sm text-fg-muted">
            {mistakes.length === 0
              ? 'You have no outstanding incorrect answers. Anything you get wrong will collect here.'
              : `${mistakes.length} question${mistakes.length === 1 ? '' : 's'} you answered incorrectly most recently, from practice and exams alike.`}
          </p>
          <div className="mt-4">
            <ButtonLink
              to="/review"
              variant={mistakes.length === 0 ? 'secondary' : 'primary'}
              size="sm"
              className="w-full"
            >
              {mistakes.length === 0 ? 'Nothing to review' : 'Practise mistakes'}
            </ButtonLink>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="label">Targeted</span>
              <h2 className="mt-0.5 text-base font-semibold text-fg">Flagged questions</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
              <Flag size={17} />
            </span>
          </div>
          <p className="mt-2 flex-1 text-sm text-fg-muted">
            {flagged.length === 0
              ? 'Flag a question while practising and it will appear here for a second pass.'
              : `${flagged.length} question${flagged.length === 1 ? '' : 's'} you marked as difficult.`}
          </p>
          <div className="mt-4">
            <ButtonLink
              to="/review?filter=flagged"
              variant={flagged.length === 0 ? 'secondary' : 'primary'}
              size="sm"
              className="w-full"
            >
              {flagged.length === 0 ? 'Nothing flagged' : 'Practise flagged'}
            </ButtonLink>
          </div>
        </Card>
      </div>

      {LEVELS.map((level) => (
        <section key={level.id}>
          <SectionHeading
            title={`Level ${level.id} topics`}
            icon={<BookOpen size={18} />}
            description={level.description}
          />
          <Card className="divide-y divide-hairline">
            {level.topics
              .filter((t) => !t.isFinal)
              .map((topic) => {
                const progress = topicProgress(data, topic);
                return (
                  <Link
                    key={topic.id}
                    to={'/practice/' + topic.id}
                    className="flex items-center gap-4 p-4 hover:bg-raised"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-raised font-mono text-xs text-fg-muted">
                      {topic.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">
                        {topic.name}
                      </span>
                      <div className="mt-1.5">
                        <ProgressBar
                          value={progress.completionPct}
                          tone={progress.status === 'completed' ? 'ok' : 'accent'}
                          label={topic.name + ' completion'}
                        />
                      </div>
                      <span className="mt-1.5 block text-xs text-fg-faint">
                        {progress.attempted}/{progress.questionCount} attempted
                        {progress.attempted > 0 && ` · ${progress.accuracyPct}% accuracy`}
                      </span>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-fg-faint" />
                  </Link>
                );
              })}
          </Card>
        </section>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- mistake review */

export function MistakeReview() {
  const [params] = useSearchParams();
  const { data } = useApp();
  const mode = params.get('filter') === 'flagged' ? 'flagged' : 'mistakes';

  const questions = useMemo(
    () => (mode === 'flagged' ? flaggedQuestions(data) : mistakeQuestions(data)),
    [data, mode]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/review" variant={mode === 'mistakes' ? 'primary' : 'secondary'} size="sm">
          <RotateCcw size={14} />
          My mistakes ({mistakeQuestions(data).length})
        </ButtonLink>
        <ButtonLink
          to="/review?filter=flagged"
          variant={mode === 'flagged' ? 'primary' : 'secondary'}
          size="sm"
        >
          <Flag size={14} />
          Flagged ({data.flagged.length})
        </ButtonLink>
      </div>

      <PracticeSession
        questions={questions}
        title={mode === 'flagged' ? 'Flagged questions' : 'Mistake review'}
        subtitle={
          mode === 'flagged'
            ? 'Questions you marked as difficult, across every level.'
            : 'Questions you answered incorrectly on your most recent attempt. Getting one right here clears it from the list.'
        }
        backTo="/practice"
        backLabel="Back to practice"
        emptyBody={
          mode === 'flagged'
            ? 'You have not flagged any questions. Use the flag button while practising to collect the tricky ones here.'
            : 'No outstanding mistakes. Either you have not answered anything yet, or you have cleared every question you previously got wrong.'
        }
      />
    </div>
  );
}
