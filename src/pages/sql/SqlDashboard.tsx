import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Flag,
  GitMerge,
  Layers,
  Target,
  Terminal,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';
import {
  allSqlLevelProgress,
  bestConfigScore,
  currentSqlLevel,
  sqlNextAction,
  sqlOverallStats,
  sqlWeakestTopics,
} from '../../lib/sql-progress';
import { SQL_FINAL_EXAMS, SQL_MOCK_TESTS } from '../../data/sql/exams';
import { formatDuration, pct } from '../../lib/format';
import {
  ButtonLink,
  Card,
  EmptyState,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  StatCard,
} from '../../components/ui';

const LEVEL_ICON = [Layers, GitMerge, Trophy];

export function SqlDashboard() {
  const { data, notify } = useApp();

  const stats = useMemo(() => sqlOverallStats(data), [data]);
  const levels = useMemo(() => allSqlLevelProgress(data), [data]);
  const weak = useMemo(() => sqlWeakestTopics(data), [data]);
  const next = useMemo(() => sqlNextAction(data), [data]);
  const level = currentSqlLevel(data);

  const overallPct =
    stats.questionsTotal === 0 ? 0 : (stats.questionsAttempted / stats.questionsTotal) * 100;

  const fresh = stats.questionsAttempted === 0 && data.sql.examResults.length === 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Hero: where you are, and the one action that continues the work. */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-5">
            <ProgressRing value={overallPct} size={76} />
            <div className="min-w-0">
              <span className="label">SQL &amp; Database Fundamentals</span>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">
                {fresh ? 'Start with the Basics' : `Level ${level} · ${levels[level - 1]?.name}`}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">
                {fresh
                  ? `${stats.topicsTotal} topics, ${stats.questionsTotal} questions and ${stats.exercisesTotal} query-writing exercises, all runnable offline.`
                  : `${stats.questionsAttempted} of ${stats.questionsTotal} questions attempted · ${stats.questionsRemaining} remaining`}
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

      {/* Key numbers, all derived from real activity. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
        <StatCard
          label="Topics covered"
          value={`${levels.reduce((n, l) => n + l.topicsCompleted, 0)}/${stats.topicsTotal}`}
          sub={`${stats.lessonsRead} lesson${stats.lessonsRead === 1 ? '' : 's'} read`}
          icon={<BookOpen size={17} />}
          tone="accent"
        />
        <StatCard
          label="Exercises completed"
          value={`${stats.exercisesCompleted}/${stats.exercisesTotal}`}
          sub={
            stats.exercisesCompleted === 0
              ? 'Query-writing exercises'
              : `${pct(stats.exerciseAvgPct)} average on attempted`
          }
          icon={<Terminal size={17} />}
          tone="ok"
        />
        <StatCard
          label="Tests &amp; exams"
          value={stats.mocksCompleted + stats.finalsCompleted}
          sub={
            stats.mocksCompleted + stats.finalsCompleted === 0
              ? 'None sat yet'
              : `${stats.mocksCompleted} mock · ${stats.finalsCompleted} final · best ${stats.bestScorePct}%`
          }
          icon={<Trophy size={17} />}
          tone="warn"
        />
        <StatCard
          label="Practice time"
          value={formatDuration(stats.totalTimeMs)}
          sub={`${stats.mistakeCount} to re-attempt · ${stats.flaggedCount} flagged`}
          icon={<Clock size={17} />}
          tone="info"
        />
      </div>

      {/* The three levels. */}
      <section>
        <SectionHeading
          title="Difficulty levels"
          icon={<Layers size={18} />}
          description="Each level has seven topics with their own lessons, exercises and exams."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {levels.map((l, i) => {
            const Icon = LEVEL_ICON[i] ?? Layers;
            return (
              <Card key={l.levelId} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="label flex items-center gap-1.5">
                      <Icon size={12} />
                      Level {l.levelId}
                    </span>
                    <h3 className="mt-0.5 text-base font-semibold text-fg">{l.name}</h3>
                    <p className="text-xs text-fg-muted">{l.tagline}</p>
                  </div>
                  <ProgressRing value={l.completionPct} size={56} />
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-fg-muted">{l.description}</p>

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
                    <dt className="text-fg-faint">Exercises</dt>
                    <dd className="font-semibold text-fg-soft">{l.exercisesAvailable} to write</dd>
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
                    label={'SQL Level ' + l.levelId + ' progress'}
                  />
                </div>

                <div className="mt-4">
                  {l.unlocked ? (
                    <ButtonLink
                      to={'/sql/level/' + l.levelId}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      Open {l.name}
                    </ButtonLink>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        notify(
                          `Score ${data.settings.passThresholdPct}% or more on the SQL Level ${l.levelId - 1} final exam to unlock this level, or switch to open mode in Settings.`
                        )
                      }
                      className="min-h-9 w-full rounded-lg border border-edge bg-raised px-3 text-[13px] font-medium text-fg-muted hover:bg-hairline hover:text-fg"
                    >
                      Locked &mdash; why?
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Dedicated practice areas. */}
      <section>
        <SectionHeading
          title="Focused practice"
          icon={<Target size={18} />}
          description="Cross-cutting areas that matter more than any single topic."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
          {[
            {
              to: '/sql/joins',
              icon: GitMerge,
              title: 'JOIN lab',
              body: 'Every join type on one tiny dataset, with the rows each one keeps shown side by side.',
            },
            {
              to: '/sql/combinations',
              icon: Layers,
              title: 'Clause combinations',
              body: 'WHERE with GROUP BY with HAVING with ORDER BY — and the logical order they run in.',
            },
            {
              to: '/sql/workbench',
              icon: Terminal,
              title: 'Workbench',
              body: 'A free SQL editor over any practice dataset. No grading, no clock.',
            },
            {
              to: '/sql/tests',
              icon: ClipboardList,
              title: 'Mock tests & finals',
              body: `${SQL_MOCK_TESTS.length} mock tests and ${SQL_FINAL_EXAMS.length} final exams, all timed.`,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="card card-link flex flex-col p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-text">
                  <Icon size={17} />
                </span>
                <h3 className="mt-3 text-base font-semibold text-fg">{item.title}</h3>
                <p className="mt-1 flex-1 text-sm text-fg-muted">{item.body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-text">
                  Open
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 md:gap-8">
        {/* Needs practice. */}
        <section>
          <SectionHeading
            title="Needs more practice"
            icon={<TrendingDown size={18} />}
            description="Lowest accuracy first, once there is enough data to judge."
          />
          {weak.length === 0 ? (
            <EmptyState
              icon={<Target size={20} />}
              title="Nothing flagged as weak yet"
              body="Answer at least three questions in a topic and it will appear here if your accuracy is below 100%."
              action={
                <ButtonLink to="/sql/level/1" size="sm">
                  Start with the Basics
                </ButtonLink>
              }
            />
          ) : (
            <Card className="divide-y divide-hairline">
              {weak.map((topic) => (
                <Link
                  key={topic.topicId}
                  to={'/sql/practice/' + topic.topicId}
                  className="flex items-center gap-4 p-4 hover:bg-raised"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bad/30 bg-bad/10 font-mono text-xs font-semibold text-bad">
                    {topic.accuracyPct}%
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {topic.topicName}
                    </span>
                    <span className="mt-0.5 block text-xs text-fg-faint">
                      Level {topic.levelId} · {topic.correct}/{topic.attempted} correct of{' '}
                      {topic.questionCount} questions
                    </span>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-fg-faint" />
                </Link>
              ))}
            </Card>
          )}
        </section>

        {/* Assessments at a glance. */}
        <section>
          <SectionHeading
            title="Assessments"
            icon={<Trophy size={18} />}
            description="Mock tests can be re-sat freely; finals are the graded capstones."
            action={
              <ButtonLink to="/sql/tests" variant="secondary" size="sm">
                All tests
                <ArrowRight size={14} />
              </ButtonLink>
            }
          />
          <Card className="divide-y divide-hairline">
            {[...SQL_MOCK_TESTS, ...SQL_FINAL_EXAMS].map((config) => {
              const best = bestConfigScore(data, config.id);
              const passed = best >= config.passPct;
              return (
                <div key={config.id} className="flex items-center gap-4 p-4">
                  <span
                    className={
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ' +
                      (passed
                        ? 'border-ok/30 bg-ok/10 text-ok'
                        : 'border-hairline bg-raised text-fg-faint')
                    }
                  >
                    {config.kind === 'final' ? <Trophy size={15} /> : <ClipboardList size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{config.name}</span>
                    <span className="mt-0.5 block text-xs text-fg-faint">
                      {config.questionCount} questions · {config.durationMinutes} min ·{' '}
                      {best > 0 ? `best ${best}%` : 'not attempted'}
                    </span>
                  </div>
                  {passed && <CheckCircle2 size={16} className="shrink-0 text-ok" />}
                </div>
              );
            })}
          </Card>
        </section>
      </div>

      {/* Revision shortcuts. */}
      <section>
        <SectionHeading title="Revision" icon={<Flag size={18} />} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          <Card className="flex flex-col p-5">
            <span className="label">Targeted</span>
            <h3 className="mt-0.5 text-base font-semibold text-fg">Re-attempt mistakes</h3>
            <p className="mt-2 flex-1 text-sm text-fg-muted">
              {stats.mistakeCount === 0
                ? 'You have no outstanding incorrect answers. Anything you get wrong will collect here.'
                : `${stats.mistakeCount} question${stats.mistakeCount === 1 ? '' : 's'} you answered incorrectly most recently, from practice and exams alike.`}
            </p>
            <ButtonLink
              to="/sql/review"
              variant={stats.mistakeCount === 0 ? 'secondary' : 'primary'}
              size="sm"
              className="mt-4 w-full"
            >
              {stats.mistakeCount === 0 ? 'Nothing to review' : 'Practise mistakes'}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col p-5">
            <span className="label">Targeted</span>
            <h3 className="mt-0.5 text-base font-semibold text-fg">Flagged questions</h3>
            <p className="mt-2 flex-1 text-sm text-fg-muted">
              {stats.flaggedCount === 0
                ? 'Flag a question while practising and it will appear here for a second pass.'
                : `${stats.flaggedCount} question${stats.flaggedCount === 1 ? '' : 's'} you marked as difficult.`}
            </p>
            <ButtonLink
              to="/sql/review?filter=flagged"
              variant={stats.flaggedCount === 0 ? 'secondary' : 'primary'}
              size="sm"
              className="mt-4 w-full"
            >
              {stats.flaggedCount === 0 ? 'Nothing flagged' : 'Practise flagged'}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col p-5">
            <span className="label">Progress</span>
            <h3 className="mt-0.5 text-base font-semibold text-fg">Results &amp; analytics</h3>
            <p className="mt-2 flex-1 text-sm text-fg-muted">
              Score history, topic mastery and per-level breakdowns for everything you have sat.
            </p>
            <ButtonLink to="/sql/progress" variant="secondary" size="sm" className="mt-4 w-full">
              <Database size={14} />
              Open progress
            </ButtonLink>
          </Card>
        </div>
      </section>
    </div>
  );
}
