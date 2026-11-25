import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Flag,
  ListChecks,
  Target,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { allLevelProgress, currentLevel, nextAction } from '../lib/progress';
import { overallStats, weakestTopics, examTrend } from '../lib/analytics';
import { formatDuration, pct } from '../lib/format';
import {
  ButtonLink,
  Card,
  EmptyState,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  StatCard,
} from '../components/ui';
import { ExamTrendChart } from '../components/charts';

export function Dashboard() {
  const { data, notify } = useApp();

  const stats = useMemo(() => overallStats(data), [data]);
  const levels = useMemo(() => allLevelProgress(data), [data]);
  const weak = useMemo(() => weakestTopics(data), [data]);
  const trend = useMemo(() => examTrend(data), [data]);
  const next = useMemo(() => nextAction(data), [data]);
  const level = currentLevel(data);

  const overallPct =
    stats.questionsTotal === 0 ? 0 : (stats.questionsAttempted / stats.questionsTotal) * 100;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Hero: where you are, and the one action that continues the work. */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-5">
            <ProgressRing value={overallPct} size={76} />
            <div className="min-w-0">
              <span className="label">Currently working on</span>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">
                Level {level} &middot; {levels[level - 1]?.name}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">
                {stats.questionsAttempted} of {stats.questionsTotal} questions attempted &middot;{' '}
                {stats.questionsRemaining} remaining
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <ButtonLink to={next.to} className="w-full md:w-auto">
              {next.label}
              <ArrowRight size={16} />
            </ButtonLink>
            <p className="mt-2 text-center text-xs text-fg-faint md:text-right">{next.detail}</p>
          </div>
        </div>
      </Card>

      {/* Key numbers. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <StatCard
          label="Overall progress"
          value={pct(overallPct)}
          sub={`${stats.questionsAttempted}/${stats.questionsTotal} questions`}
          icon={<ListChecks size={17} />}
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
          icon={<Target size={17} />}
          tone="ok"
        />
        <StatCard
          label="Average exam score"
          value={stats.examsTaken === 0 ? '--' : pct(stats.averageExamPct)}
          sub={
            stats.examsTaken === 0
              ? 'No exams taken yet'
              : `${stats.examsTaken} exam${stats.examsTaken === 1 ? '' : 's'} · best ${stats.bestExamPct}%`
          }
          icon={<Trophy size={17} />}
          tone="warn"
        />
        <StatCard
          label="Total practice time"
          value={formatDuration(stats.totalTimeMs)}
          sub={`${stats.mistakeCount} to re-attempt · ${stats.flaggedCount} flagged`}
          icon={<Clock size={17} />}
          tone="info"
        />
      </div>

      {/* The three levels, same card shape for each. */}
      <section>
        <SectionHeading
          title="Levels"
          icon={<ListChecks size={18} />}
          description="Each level has its own roadmap, topic exams and final exam."
          action={
            <ButtonLink to="/roadmap" variant="secondary" size="sm">
              Full roadmap
              <ArrowRight size={14} />
            </ButtonLink>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {levels.map((l) => (
            <Card key={l.level} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="label">Level {l.level}</span>
                  <h3 className="mt-0.5 text-base font-semibold text-fg">{l.name}</h3>
                  <p className="text-xs text-fg-muted">{l.tagline}</p>
                </div>
                <ProgressRing value={l.completionPct} size={56} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-fg-faint">Topics done</dt>
                  <dd className="font-semibold text-fg-soft">
                    {l.topicsCompleted}/{l.topicsTotal}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-faint">Questions</dt>
                  <dd className="font-semibold text-fg-soft">
                    {l.attempted}/{l.questionCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-faint">Accuracy</dt>
                  <dd className="font-semibold text-fg-soft">
                    {l.attempted === 0 ? '--' : pct(l.accuracyPct)}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-faint">Final exam</dt>
                  <dd className="font-semibold text-fg-soft">
                    {l.finalBestPct > 0 ? pct(l.finalBestPct) : '--'}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <ProgressBar
                  value={l.completionPct}
                  tone={l.finalBestPct >= data.settings.passThresholdPct ? 'ok' : 'accent'}
                  label={'Level ' + l.level + ' progress'}
                />
              </div>

              <div className="mt-4">
                {l.unlocked ? (
                  <ButtonLink
                    to={'/level/' + l.level}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Open level
                  </ButtonLink>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      notify(
                        `Score ${data.settings.passThresholdPct}% or more on the Level ${l.level - 1} final exam to unlock this level, or switch to open mode in Settings.`
                      )
                    }
                    className="min-h-9 w-full rounded-lg border border-edge bg-raised px-3 text-[13px] font-medium text-fg-muted hover:bg-hairline hover:text-fg"
                  >
                    Locked &mdash; why?
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 md:gap-8">
        {/* Weakest topics. */}
        <section>
          <SectionHeading
            title="Weakest topics"
            icon={<TrendingDown size={18} />}
            description="Lowest accuracy among topics with at least three attempts."
          />
          {weak.length === 0 ? (
            <EmptyState
              icon={<Flag size={20} />}
              title="Not enough data yet"
              body="Answer at least three questions in a topic and it will start appearing here, ranked by accuracy."
              action={
                <ButtonLink to="/practice" size="sm">
                  Start practising
                </ButtonLink>
              }
            />
          ) : (
            <Card className="divide-y divide-hairline">
              {weak.map((t) => (
                <Link
                  key={t.topicId}
                  to={'/practice/' + t.topicId}
                  className="flex items-center gap-4 p-4 hover:bg-raised"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-fg">{t.topicName}</span>
                      <span
                        className={
                          'shrink-0 text-sm font-semibold ' +
                          (t.accuracyPct < 50 ? 'text-bad' : 'text-warn')
                        }
                      >
                        {pct(t.accuracyPct)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        value={t.accuracyPct}
                        tone={t.accuracyPct < 50 ? 'bad' : 'warn'}
                        label={t.topicName + ' accuracy'}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-fg-faint">
                      Level {t.level} &middot; {t.correct}/{t.attempted} correct of{' '}
                      {t.questionCount} questions
                    </p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-fg-faint" />
                </Link>
              ))}
            </Card>
          )}
        </section>

        {/* Exam history trend. */}
        <section>
          <SectionHeading
            title="Exam scores over time"
            icon={<BarChart3 size={18} />}
            description="Every exam you have submitted, oldest first."
            action={
              trend.length > 0 ? (
                <ButtonLink to="/analytics" variant="secondary" size="sm">
                  Analytics
                  <ArrowRight size={14} />
                </ButtonLink>
              ) : undefined
            }
          />
          {trend.length === 0 ? (
            <EmptyState
              icon={<Trophy size={20} />}
              title="No exams yet"
              body="Take a topic exam or a level final and your scores will plot here so you can watch the trend."
              action={
                <ButtonLink to="/exam" size="sm">
                  Go to exams
                </ButtonLink>
              }
            />
          ) : (
            <Card className="p-5">
              <ExamTrendChart points={trend} />
            </Card>
          )}
        </section>
      </div>

      {stats.examsTaken > 0 && (
        <Card className="flex flex-col items-start gap-3 border-ok/30 bg-ok/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
            <p className="text-sm text-fg-soft">
              Your best exam score so far is{' '}
              <strong className="font-semibold text-fg">{stats.bestExamPct}%</strong>. The pass mark
              for unlocking the next level is {data.settings.passThresholdPct}%.
            </p>
          </div>
          <ButtonLink to="/analytics" variant="secondary" size="sm" className="shrink-0">
            See breakdown
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
