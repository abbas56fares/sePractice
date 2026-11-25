import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  Layers,
  Target,
  Terminal,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import {
  allSqlLevelProgress,
  sqlFlaggedQuestions,
  sqlMistakeQuestions,
  sqlOverallStats,
  sqlRepeatedMistakes,
  sqlScoreTrend,
  sqlTopicPerformance,
} from '../../lib/sql-progress';
import { formatDuration, pct } from '../../lib/format';
import { ExamTrendChart } from '../../components/charts';
import {
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  StatCard,
} from '../../components/ui';

export function SqlProgressPage() {
  const { data } = useApp();

  const stats = useMemo(() => sqlOverallStats(data), [data]);
  const levels = useMemo(() => allSqlLevelProgress(data), [data]);
  const topics = useMemo(() => sqlTopicPerformance(data), [data]);
  const trend = useMemo(() => sqlScoreTrend(data), [data]);
  const mistakes = useMemo(() => sqlMistakeQuestions(data), [data]);
  const repeated = useMemo(() => sqlRepeatedMistakes(data), [data]);
  const flagged = useMemo(() => sqlFlaggedQuestions(data), [data]);

  const attemptedTopics = topics.filter((t) => t.attempted > 0);
  const mastered = attemptedTopics.filter((t) => t.accuracyPct >= 80).length;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
          SQL progress &amp; results
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Everything here is computed from what you have actually answered. Nothing is seeded or
          estimated.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <StatCard
          label="Questions attempted"
          value={`${stats.questionsAttempted}/${stats.questionsTotal}`}
          sub={`${stats.questionsRemaining} remaining`}
          icon={<Target size={17} />}
          tone="accent"
        />
        <StatCard
          label="Accuracy"
          value={stats.questionsAttempted === 0 ? '--' : pct(stats.accuracyPct)}
          sub={
            stats.questionsAttempted === 0
              ? 'Answer a question to begin'
              : 'Correct on latest attempt'
          }
          icon={<CheckCircle2 size={17} />}
          tone="ok"
        />
        <StatCard
          label="Exercises written"
          value={`${stats.exercisesCompleted}/${stats.exercisesTotal}`}
          sub={
            stats.exercisesCompleted === 0
              ? 'Query-writing exercises'
              : `${pct(stats.exerciseAvgPct)} average`
          }
          icon={<Terminal size={17} />}
          tone="warn"
        />
        <StatCard
          label="Time on SQL"
          value={formatDuration(stats.totalTimeMs)}
          sub={`${stats.lessonsRead}/${stats.topicsTotal} lessons read`}
          icon={<Clock size={17} />}
          tone="info"
        />
      </div>

      {/* Score trend. */}
      <section>
        <SectionHeading
          title="Score history"
          icon={<BarChart3 size={18} />}
          description="Every topic exam, mock test and final, oldest first."
        />
        {trend.length === 0 ? (
          <EmptyState
            icon={<Trophy size={20} />}
            title="No exams sat yet"
            body="Your scores will plot here once you have sat a topic exam, a mock test or a final."
            action={
              <ButtonLink to="/sql/tests" size="sm">
                Browse the tests
              </ButtonLink>
            }
          />
        ) : (
          <Card className="p-5">
            <ExamTrendChart points={trend} />
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted">
              <span>
                Best <span className="font-semibold text-fg">{stats.bestScorePct}%</span>
              </span>
              <span>
                Average{' '}
                <span className="font-semibold text-fg">
                  {pct(trend.reduce((n, p) => n + p.pct, 0) / trend.length)}
                </span>
              </span>
              <span>
                Latest{' '}
                <span className="font-semibold text-fg">
                  {trend[trend.length - 1]?.pct ?? 0}%
                </span>
              </span>
              <Link to="/sql/results" className="ml-auto text-accent-text hover:underline">
                Full history &rarr;
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* Level breakdown. */}
      <section>
        <SectionHeading title="Progress by difficulty" icon={<Layers size={18} />} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {levels.map((level) => (
            <Card key={level.levelId} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="label">Level {level.levelId}</span>
                  <h3 className="mt-0.5 text-base font-semibold text-fg">{level.name}</h3>
                </div>
                <ProgressRing value={level.completionPct} size={52} />
              </div>
              <dl className="mt-4 flex flex-col gap-2 text-xs">
                {[
                  { k: 'Topics complete', v: `${level.topicsCompleted}/${level.topicsTotal}` },
                  { k: 'Questions', v: `${level.attempted}/${level.questionCount}` },
                  {
                    k: 'Accuracy',
                    v: level.attempted === 0 ? '--' : pct(level.accuracyPct),
                  },
                  { k: 'Lessons read', v: `${level.lessonsRead}/${level.topicsTotal}` },
                  {
                    k: 'Final exam',
                    v: level.finalBestPct > 0 ? pct(level.finalBestPct) : 'not sat',
                  },
                ].map((row) => (
                  <div key={row.k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-fg-faint">{row.k}</dt>
                    <dd className="font-semibold text-fg-soft">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </section>

      {/* Topic mastery. */}
      <section>
        <SectionHeading
          title="Topic mastery"
          icon={<Target size={18} />}
          description={
            attemptedTopics.length === 0
              ? 'Attempt some questions and each topic will report its accuracy here.'
              : `${mastered} of ${attemptedTopics.length} attempted topics are at 80% or better.`
          }
        />
        <Card className="divide-y divide-hairline">
          {topics.map((topic) => (
            <div key={topic.topicId} className="flex items-center gap-4 p-4">
              <Pill className="shrink-0 font-mono">L{topic.levelId}</Pill>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    to={'/sql/topic/' + topic.topicId}
                    className="truncate text-sm font-medium text-fg hover:text-accent-text"
                  >
                    {topic.topicName}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-fg-faint">
                    {topic.attempted}/{topic.questionCount}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar
                    value={topic.attempted === 0 ? 0 : topic.accuracyPct}
                    tone={
                      topic.attempted === 0
                        ? 'accent'
                        : topic.accuracyPct >= 80
                          ? 'ok'
                          : topic.accuracyPct >= 50
                            ? 'warn'
                            : 'bad'
                    }
                    label={topic.topicName + ' accuracy'}
                  />
                </div>
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-sm font-semibold text-fg">
                {topic.attempted === 0 ? '--' : topic.accuracyPct + '%'}
              </span>
            </div>
          ))}
        </Card>
      </section>

      {/* Revision queues. */}
      <section>
        <SectionHeading title="Revision queues" icon={<TrendingDown size={18} />} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          {[
            {
              to: '/sql/review',
              icon: TrendingDown,
              title: 'Outstanding mistakes',
              count: mistakes.length,
              body: 'Wrong on your most recent attempt. Getting one right clears it.',
            },
            {
              to: '/sql/review?filter=repeated',
              icon: Target,
              title: 'Repeatedly wrong',
              count: repeated.length,
              body: 'Missed twice or more — the ones worth slowing down on.',
            },
            {
              to: '/sql/review?filter=flagged',
              icon: Flag,
              title: 'Flagged for review',
              count: flagged.length,
              body: 'Questions you marked while practising.',
            },
          ].map((queue) => {
            const Icon = queue.icon;
            return (
              <Card key={queue.to} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-raised text-fg-muted">
                    <Icon size={17} />
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-fg">{queue.count}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-fg">{queue.title}</h3>
                <p className="mt-1 flex-1 text-sm text-fg-muted">{queue.body}</p>
                <ButtonLink
                  to={queue.to}
                  variant={queue.count === 0 ? 'secondary' : 'primary'}
                  size="sm"
                  className="mt-4 w-full"
                >
                  {queue.count === 0 ? 'Nothing here' : 'Practise'}
                  {queue.count > 0 && <ArrowRight size={13} />}
                </ButtonLink>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading title="Lessons" icon={<BookOpen size={18} />} />
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-fg-muted">
              {stats.lessonsRead} of {stats.topicsTotal} lessons marked as read
            </span>
            <span className="font-mono text-sm font-semibold text-fg">
              {pct((stats.lessonsRead / Math.max(1, stats.topicsTotal)) * 100)}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={(stats.lessonsRead / Math.max(1, stats.topicsTotal)) * 100}
              tone="accent"
              label="Lessons read"
            />
          </div>
        </Card>
      </section>
    </div>
  );
}
