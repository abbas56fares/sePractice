import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  LayoutList,
  RotateCcw,
  Target,
  Timer,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { TOPIC_BY_ID, finalTopic } from '../data/levels';
import { getQuestion } from '../data/questions';
import { examTopicBreakdown, scoreExam } from '../lib/exam';
import { formatDateTime, formatDuration, pct } from '../lib/format';
import { CodeBlock } from '../components/CodeBlock';
import { Explanation, QuestionMeta } from '../components/QuestionView';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  StatCard,
} from '../components/ui';

type ReviewFilter = 'all' | 'incorrect' | 'unanswered' | 'flagged';

export function ExamResults() {
  const { resultId } = useParams();
  const { data, resultById, lastResult } = useApp();
  const [filter, setFilter] = useState<ReviewFilter>('incorrect');

  const result = resultId ? resultById(resultId) : lastResult;

  if (!result) {
    return (
      <EmptyState
        icon={<Trophy size={20} />}
        title="No exam results yet"
        body="Submit a topic exam or a level final and the full breakdown will appear here, with explanations for every question."
        action={
          <ButtonLink to="/exam" size="sm">
            Go to exams
          </ButtonLink>
        }
      />
    );
  }

  // A fresh submission lands on /results without an id; normalise the URL so
  // the result is linkable and survives a refresh.
  if (!resultId) return <Navigate to={'/results/' + result.id} replace />;

  const score = scoreExam(result.questionIds, result.answers);
  const breakdown = examTopicBreakdown(result);
  const passed = result.pct >= data.settings.passThresholdPct;
  const topic = result.topicId ? TOPIC_BY_ID.get(result.topicId) : undefined;
  const retryTarget = result.topicId
    ? '/exam/start/' + result.topicId
    : '/exam/start/' + (finalTopic(result.level)?.id ?? '');

  const questions = result.questionIds
    .map((id, i) => ({ q: getQuestion(id), i }))
    .filter((x): x is { q: NonNullable<ReturnType<typeof getQuestion>>; i: number } =>
      Boolean(x.q)
    )
    .filter(({ q }) => {
      const given = result.answers[q.id];
      if (filter === 'incorrect') return Boolean(given) && given !== q.answer;
      if (filter === 'unanswered') return !given;
      if (filter === 'flagged') return result.flagged.includes(q.id);
      return true;
    });

  const counts: Record<ReviewFilter, number> = {
    all: result.questionIds.length,
    incorrect: score.incorrectIds.length,
    unanswered: score.unansweredIds.length,
    flagged: result.flagged.length,
  };

  const avgMs = result.total === 0 ? 0 : result.elapsedMs / result.total;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/analytics" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Exam history
      </Link>

      {/* Headline score. */}
      <Card
        className={
          'overflow-hidden ' + (passed ? 'border-ok/40 bg-ok/5' : 'border-warn/40 bg-warn/5')
        }
      >
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-5">
            <ProgressRing value={result.pct} size={88}>
              <span className="text-sm font-bold">{result.pct}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <span className="label">
                {result.kind === 'final' ? `Level ${result.level} final exam` : 'Topic exam'}
                {result.autoSubmitted && ' · auto-submitted'}
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg md:text-3xl">
                {result.score} / {result.total}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">
                {topic?.name ?? 'Drawn from every topic in the level'} &middot;{' '}
                {formatDateTime(result.submittedAt)}
              </p>
              <p
                className={
                  'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ' +
                  (passed
                    ? 'border-ok/40 bg-ok/10 text-ok'
                    : 'border-warn/40 bg-warn/10 text-warn')
                }
              >
                {passed ? <CheckCircle2 size={13} /> : <Target size={13} />}
                {passed
                  ? `Passed — at or above the ${data.settings.passThresholdPct}% mark`
                  : `Below the ${data.settings.passThresholdPct}% pass mark`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
            <ButtonLink to={retryTarget}>
              <RotateCcw size={15} />
              Retry exam
            </ButtonLink>
            <Button variant="secondary" onClick={() => setFilter('incorrect')}>
              <XCircle size={15} />
              Review mistakes
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-5">
        <StatCard
          label="Correct"
          value={score.correctIds.length}
          sub={pct((score.correctIds.length / Math.max(1, result.total)) * 100) + ' of the paper'}
          icon={<CheckCircle2 size={17} />}
          tone="ok"
        />
        <StatCard
          label="Incorrect"
          value={score.incorrectIds.length}
          sub="Answered but wrong"
          icon={<XCircle size={17} />}
          tone="bad"
        />
        <StatCard
          label="Unanswered"
          value={score.unansweredIds.length}
          sub="Scored as zero"
          icon={<Flag size={17} />}
          tone="warn"
        />
        <StatCard
          label="Time used"
          value={formatDuration(result.elapsedMs)}
          sub={`of ${formatDuration(result.allowedMs)} · ~${formatDuration(avgMs)}/question`}
          icon={<Clock size={17} />}
          tone="info"
        />
      </div>

      {/* Topic-by-topic performance. */}
      <section>
        <SectionHeading
          title="Performance by topic"
          icon={<LayoutList size={18} />}
          description="Weakest first. This is where to aim your next practice session."
        />
        <Card className="divide-y divide-hairline">
          {breakdown.map((row) => {
            const t = TOPIC_BY_ID.get(row.topicId);
            return (
              <div key={row.topicId} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-fg">
                      {t?.name ?? row.topicId}
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">
                      {row.correct}/{row.total} &middot;{' '}
                      <span
                        className={
                          'font-semibold ' +
                          (row.pct >= 70 ? 'text-ok' : row.pct >= 40 ? 'text-warn' : 'text-bad')
                        }
                      >
                        {row.pct}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={row.pct}
                      tone={row.pct >= 70 ? 'ok' : row.pct >= 40 ? 'warn' : 'bad'}
                      label={(t?.name ?? row.topicId) + ' score'}
                    />
                  </div>
                </div>
                {t && (
                  <ButtonLink
                    to={'/practice/' + t.id}
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                  >
                    Practise
                  </ButtonLink>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      {/* Full question-by-question review with explanations. */}
      <section>
        <SectionHeading
          title="Question review"
          icon={<Timer size={18} />}
          description="Every question with the keyed answer, the reasoning, and why each distractor fails."
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {(['incorrect', 'unanswered', 'flagged', 'all'] as ReviewFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(f)}
              disabled={counts[f] === 0 && f !== 'all'}
            >
              <span className="capitalize">{f}</span>
              <span className="opacity-70">({counts[f]})</span>
            </Button>
          ))}
        </div>

        {questions.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={20} />}
            title="Nothing in this category"
            body={
              filter === 'incorrect'
                ? 'You did not get a single question wrong on this exam.'
                : filter === 'unanswered'
                  ? 'You answered every question. Good time management.'
                  : 'You did not flag anything during this exam.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Show all questions
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map(({ q, i }) => {
              const given = result.answers[q.id];
              const wasCorrect = given === q.answer;
              const spent = result.timePerQuestion[q.id];

              return (
                <Card key={q.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Pill>Question {i + 1}</Pill>
                    {result.flagged.includes(q.id) && (
                      <Pill className="border-warn/40 text-warn">
                        <Flag size={11} /> flagged
                      </Pill>
                    )}
                    {spent !== undefined && spent > 0 && (
                      <Pill>
                        <Clock size={11} /> {formatDuration(spent)}
                      </Pill>
                    )}
                    <span
                      className={
                        'ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ' +
                        (given === undefined
                          ? 'border-warn/40 bg-warn/10 text-warn'
                          : wasCorrect
                            ? 'border-ok/40 bg-ok/10 text-ok'
                            : 'border-bad/40 bg-bad/10 text-bad')
                      }
                    >
                      {given === undefined
                        ? 'Unanswered'
                        : wasCorrect
                          ? 'Correct'
                          : 'Your answer: ' + given.toUpperCase()}
                    </span>
                  </div>

                  <QuestionMeta question={q} />
                  <h3 className="mt-3 text-sm font-semibold leading-relaxed text-fg md:text-base">
                    {q.prompt}
                  </h3>
                  {q.code && <CodeBlock code={q.code} lang={q.codeLang ?? 'java'} />}

                  <ul className="mt-4 flex flex-col gap-2">
                    {q.options.map((o) => {
                      const isCorrect = o.id === q.answer;
                      const isGiven = o.id === given;
                      return (
                        <li
                          key={o.id}
                          className={
                            'flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm ' +
                            (isCorrect
                              ? 'border-ok/50 bg-ok/10'
                              : isGiven
                                ? 'border-bad/50 bg-bad/10'
                                : 'border-hairline bg-surface opacity-70')
                          }
                        >
                          <span className="font-mono text-xs font-semibold uppercase text-fg-muted">
                            {o.id}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-fg-soft">
                            {o.text}
                          </span>
                          {isCorrect && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />}
                          {isGiven && !isCorrect && (
                            <XCircle size={15} className="mt-0.5 shrink-0 text-bad" />
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <Explanation question={q} selected={given} />
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
