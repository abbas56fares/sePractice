import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Flag,
  Target,
  Timer,
  TrendingDown,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { SqlExamResult } from '../../types/sql';
import { isExecutable } from '../../types/sql';
import { useApp } from '../../state/AppContext';
import { getSqlTopic } from '../../data/sql/levels';
import { getSqlExamConfig } from '../../data/sql/exams';
import { getSqlQuestions } from '../../data/sql/questions';
import { sqlExamTopicBreakdown, revisionTopics } from '../../lib/sql-exam';
import { formatDateTime, formatDuration, pct } from '../../lib/format';
import { CodeBlock } from '../../components/CodeBlock';
import { SqlQuestionView } from '../../components/sql/SqlQuestionView';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  SectionHeading,
  StatCard,
} from '../../components/ui';

type ReviewFilter = 'all' | 'incorrect' | 'flagged';

function ResultDetail({ result }: { result: SqlExamResult }) {
  const [filter, setFilter] = useState<ReviewFilter>('incorrect');
  const config = getSqlExamConfig(result.configId);
  const questions = useMemo(() => getSqlQuestions(result.questionIds), [result.questionIds]);
  const breakdown = useMemo(() => sqlExamTopicBreakdown(result), [result]);
  const revise = useMemo(() => revisionTopics(result), [result]);

  const passed = result.pct >= result.passPct;
  const unanswered = result.questionIds.filter(
    (id) => result.answers[id] === undefined && !result.queries[id]?.trim()
  ).length;

  const visible = questions.filter((q) => {
    if (filter === 'incorrect') return !result.correct[q.id];
    if (filter === 'flagged') return result.flagged.includes(q.id);
    return true;
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql/results" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        All SQL results
      </Link>

      {/* Headline. */}
      <Card className="p-5 text-center md:p-6">
        <span
          className={
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ' +
            (passed ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad')
          }
        >
          {passed ? <Trophy size={26} /> : <Target size={26} />}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg md:text-4xl">
          {result.pct}%
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {result.score} of {result.total} correct &middot;{' '}
          {config?.name ??
            (result.topicId ? (getSqlTopic(result.topicId)?.name ?? 'Topic exam') : 'SQL exam')}
        </p>
        <p
          className={
            'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ' +
            (passed
              ? 'border-ok/30 bg-ok/10 text-ok'
              : 'border-bad/30 bg-bad/10 text-bad')
          }
        >
          {passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {passed ? 'Passed' : `Below the ${result.passPct}% pass mark`}
        </p>
        {result.autoSubmitted && (
          <p className="mt-3 text-xs text-warn">
            This paper was submitted automatically when the timer reached zero.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <StatCard label="Score" value={`${result.score}/${result.total}`} icon={<Target size={16} />} />
        <StatCard
          label="Time used"
          value={formatDuration(result.elapsedMs)}
          sub={`of ${formatDuration(result.allowedMs)} allowed`}
          icon={<Timer size={16} />}
          tone="info"
        />
        <StatCard
          label="Unanswered"
          value={unanswered}
          icon={<Flag size={16} />}
          tone={unanswered > 0 ? 'bad' : 'ok'}
        />
        <StatCard
          label="Submitted"
          value={formatDateTime(result.submittedAt)}
          icon={<ClipboardList size={16} />}
          tone="accent"
        />
      </div>

      {/* Topic performance. */}
      <section>
        <SectionHeading
          title="Topic performance"
          description="How each topic in this paper went, weakest first."
        />
        <Card className="divide-y divide-hairline">
          {breakdown.map((row) => {
            const topic = getSqlTopic(row.topicId);
            return (
              <div key={row.topicId} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-fg">
                      {topic?.name ?? row.topicId}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-fg-muted">
                      {row.correct}/{row.total}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar
                      value={row.pct}
                      tone={row.pct >= result.passPct ? 'ok' : row.pct >= 50 ? 'warn' : 'bad'}
                      label={(topic?.name ?? row.topicId) + ' score'}
                    />
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold text-fg">
                  {row.pct}%
                </span>
              </div>
            );
          })}
        </Card>
      </section>

      {/* What to revise. */}
      {revise.length > 0 && (
        <section>
          <SectionHeading
            title="Recommended revision"
            icon={<TrendingDown size={18} />}
            description={`Topics that scored below the ${result.passPct}% pass mark in this paper.`}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
            {revise.map((row) => {
              const topic = getSqlTopic(row.topicId);
              if (!topic) return null;
              return (
                <Card key={row.topicId} className="flex flex-col p-5">
                  <span className="label">
                    Level {topic.levelId} · scored {row.pct}%
                  </span>
                  <h3 className="mt-0.5 text-base font-semibold text-fg">{topic.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-fg-muted">{topic.description}</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <ButtonLink to={'/sql/topic/' + topic.id} variant="secondary" size="sm" className="flex-1">
                      Re-read the lesson
                    </ButtonLink>
                    <ButtonLink to={'/sql/practice/' + topic.id} size="sm" className="flex-1">
                      Practise
                      <ArrowRight size={13} />
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Answer review. */}
      <section>
        <SectionHeading
          title="Answer review"
          description="Every question with the full explanation, and your query where you wrote one."
          action={
            <div className="flex flex-wrap gap-2">
              {(['incorrect', 'flagged', 'all'] as ReviewFilter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'primary' : 'secondary'}
                  onClick={() => setFilter(f)}
                >
                  {f === 'incorrect'
                    ? `Incorrect (${result.total - result.score})`
                    : f === 'flagged'
                      ? `Flagged (${result.flagged.length})`
                      : `All (${result.total})`}
                </Button>
              ))}
            </div>
          }
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={20} />}
            title={filter === 'incorrect' ? 'Nothing wrong' : 'Nothing flagged'}
            body={
              filter === 'incorrect'
                ? 'You answered every question in this paper correctly.'
                : 'You did not flag any questions during this exam.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Show all questions
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4 md:gap-5">
            {visible.map((q, i) => {
              const ok = result.correct[q.id];
              const submittedSql = result.queries[q.id];
              return (
                <Card key={q.id} className="p-5 md:p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Pill
                      className={
                        ok
                          ? 'border-ok/30 bg-ok/10 text-ok'
                          : 'border-bad/30 bg-bad/10 text-bad'
                      }
                    >
                      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {ok ? 'Correct' : 'Incorrect'}
                    </Pill>
                    <span className="text-xs text-fg-faint">
                      Question {result.questionIds.indexOf(q.id) + 1} of {result.total}
                    </span>
                    {result.flagged.includes(q.id) && (
                      <Pill className="border-warn/30 bg-warn/10 text-warn">
                        <Flag size={11} />
                        Flagged
                      </Pill>
                    )}
                  </div>

                  {isExecutable(q) && submittedSql && (
                    <div className="mb-4">
                      <span className="label">What you submitted</span>
                      <CodeBlock code={submittedSql} lang="sql" showLineNumbers={false} />
                    </div>
                  )}

                  <SqlQuestionView
                    question={q}
                    answer={{
                      ...(result.answers[q.id] !== undefined
                        ? { option: result.answers[q.id] }
                        : {}),
                      ...(submittedSql !== undefined ? { sql: submittedSql } : {}),
                    }}
                    onAnswer={() => undefined}
                    revealed
                    grade={
                      isExecutable(q)
                        ? { correct: Boolean(ok), headline: ok ? 'Correct' : 'Incorrect' }
                        : null
                    }
                    disabled
                    hintsEnabled={false}
                  />
                  {i < visible.length - 1 && <div className="h-px" />}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink to="/sql/tests" variant="secondary">
          Back to tests
        </ButtonLink>
        <ButtonLink to={'/sql/exam/start/' + result.configId}>
          Sit this paper again
          <ArrowRight size={15} />
        </ButtonLink>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- history */

export function SqlResults() {
  const { resultId } = useParams();
  const { data } = useApp();

  const results = useMemo(
    () => [...data.sql.examResults].sort((a, b) => b.submittedAt - a.submittedAt),
    [data.sql.examResults]
  );

  if (resultId) {
    const result = results.find((r) => r.id === resultId);
    if (result) return <ResultDetail result={result} />;
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft size={15} />
          Back to the SQL dashboard
        </Link>
        <EmptyState
          icon={<ClipboardList size={20} />}
          title="No SQL exams yet"
          body="Sit a topic exam, a mock test or a final and the result will appear here with a full topic breakdown and answer review."
          action={
            <ButtonLink to="/sql/tests" size="sm">
              Browse the tests
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">SQL exam history</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {results.length} attempt{results.length === 1 ? '' : 's'}, newest first.
        </p>
      </div>

      <Card className="divide-y divide-hairline">
        {results.map((result) => {
          const config = getSqlExamConfig(result.configId);
          const passed = result.pct >= result.passPct;
          const name =
            config?.name ??
            (result.topicId
              ? `${getSqlTopic(result.topicId)?.name ?? result.topicId} exam`
              : 'SQL exam');

          return (
            <Link
              key={result.id}
              to={'/sql/results/' + result.id}
              className="flex items-center gap-4 p-4 hover:bg-raised"
            >
              <span
                className={
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold ' +
                  (passed
                    ? 'border-ok/30 bg-ok/10 text-ok'
                    : 'border-bad/30 bg-bad/10 text-bad')
                }
              >
                {result.pct}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{name}</span>
                <span className="mt-0.5 block text-xs text-fg-faint">
                  {formatDateTime(result.submittedAt)} · {result.score}/{result.total} correct ·{' '}
                  {formatDuration(result.elapsedMs)}
                  {result.autoSubmitted && ' · auto-submitted'}
                </span>
              </div>
              <ArrowRight size={16} className="shrink-0 text-fg-faint" />
            </Link>
          );
        })}
      </Card>

      <p className="text-center text-xs text-fg-faint">
        Average across every attempt:{' '}
        {pct(results.reduce((n, r) => n + r.pct, 0) / results.length)}
      </p>
    </div>
  );
}
