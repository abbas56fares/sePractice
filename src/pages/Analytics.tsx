import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  History,
  Lightbulb,
  Target,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { TOPIC_BY_ID } from '../data/levels';
import {
  dailyActivity,
  examTrend,
  overallStats,
  recommendations,
  topicPerformance,
} from '../lib/analytics';
import { allLevelProgress } from '../lib/progress';
import { formatDateTime, formatDuration, pct } from '../lib/format';
import { ActivityChart, ExamTrendChart } from '../components/charts';
import {
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  ProgressBar,
  SectionHeading,
  StatCard,
} from '../components/ui';

export function Analytics() {
  const { data } = useApp();

  const stats = useMemo(() => overallStats(data), [data]);
  const trend = useMemo(() => examTrend(data), [data]);
  const activity = useMemo(() => dailyActivity(data), [data]);
  const topics = useMemo(
    () => topicPerformance(data).sort((a, b) => a.level - b.level || a.topicName.localeCompare(b.topicName)),
    [data]
  );
  const advice = useMemo(() => recommendations(data), [data]);
  const levels = useMemo(() => allLevelProgress(data), [data]);
  const history = useMemo(
    () => [...data.examResults].sort((a, b) => b.submittedAt - a.submittedAt),
    [data.examResults]
  );

  const attemptedTopics = topics.filter((t) => t.attempted > 0);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Progress analytics</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Everything recorded so far: accuracy by topic, exam history, practice volume, and what to
          work on next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-5">
        <StatCard
          label="Questions attempted"
          value={`${stats.questionsAttempted}/${stats.questionsTotal}`}
          sub={pct((stats.questionsAttempted / Math.max(1, stats.questionsTotal)) * 100) + ' of the bank'}
          icon={<Target size={17} />}
        />
        <StatCard
          label="Accuracy"
          value={stats.questionsAttempted === 0 ? '--' : pct(stats.accuracyPct)}
          sub="Correct on latest attempt"
          icon={<CheckCircle2 size={17} />}
          tone="ok"
        />
        <StatCard
          label="Exams taken"
          value={stats.examsTaken}
          sub={
            stats.examsTaken === 0
              ? 'None yet'
              : `avg ${stats.averageExamPct}% · best ${stats.bestExamPct}%`
          }
          icon={<Trophy size={17} />}
          tone="warn"
        />
        <StatCard
          label="Time invested"
          value={formatDuration(stats.totalTimeMs)}
          sub={
            stats.questionsAttempted === 0
              ? undefined
              : `~${formatDuration(stats.totalTimeMs / stats.questionsAttempted)}/question`
          }
          icon={<Clock size={17} />}
          tone="info"
        />
      </div>

      {/* What to do next. */}
      <section>
        <SectionHeading
          title="Recommended next"
          icon={<Lightbulb size={18} />}
          description="Derived from your actual results rather than a fixed order."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5">
          {advice.map((r) => (
            <Card key={r.title} className="flex flex-col p-5">
              <h3 className="text-sm font-semibold text-fg">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{r.body}</p>
              <div className="mt-4">
                <ButtonLink to={r.to} variant="secondary" size="sm" className="w-full">
                  {r.actionLabel}
                  <ArrowRight size={14} />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 md:gap-8">
        <section>
          <SectionHeading
            title="Exam scores over time"
            icon={<BarChart3 size={18} />}
            description="Oldest to newest, against the pass mark."
          />
          {trend.length === 0 ? (
            <EmptyState
              icon={<Trophy size={20} />}
              title="No exams yet"
              body="Scores plot here once you have submitted at least one exam."
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

        <section>
          <SectionHeading
            title="Practice activity"
            icon={<Activity size={18} />}
            description="Questions answered per day over the last two weeks."
          />
          <Card className="p-5">
            <ActivityChart days={activity} />
            <p className="mt-3 text-xs text-fg-muted">
              {activity.reduce((n, d) => n + d.answered, 0)} questions answered in this window.
            </p>
          </Card>
        </section>
      </div>

      {/* Level summary. */}
      <section>
        <SectionHeading title="By level" icon={<Target size={18} />} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {levels.map((l) => (
            <Card key={l.level} className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-fg">
                  Level {l.level} &middot; {l.name}
                </span>
                <span className="text-sm font-semibold text-fg-muted">{l.completionPct}%</span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={l.completionPct}
                  tone={l.finalBestPct >= data.settings.passThresholdPct ? 'ok' : 'accent'}
                  label={'Level ' + l.level}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>
                  {l.topicsCompleted}/{l.topicsTotal} topics
                </Pill>
                <Pill>{l.attempted === 0 ? 'no data' : pct(l.accuracyPct) + ' accuracy'}</Pill>
                <Pill>{l.finalBestPct > 0 ? 'final ' + l.finalBestPct + '%' : 'no final yet'}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Topic table. */}
      <section>
        <SectionHeading
          title="Topic-by-topic performance"
          icon={<TrendingDown size={18} />}
          description="Accuracy is measured on your most recent attempt at each question."
        />
        {attemptedTopics.length === 0 ? (
          <EmptyState
            icon={<Target size={20} />}
            title="No topic data yet"
            body="Answer some questions and every topic you touch will appear here with its accuracy and average time."
            action={
              <ButtonLink to="/practice" size="sm">
                Start practising
              </ButtonLink>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            {/* Wide table scrolls inside its own box. */}
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-edge text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                      Topic
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                      Lvl
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                      Attempted
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                      Accuracy
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                      Avg time
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {attemptedTopics.map((t) => (
                    <tr key={t.topicId} className="border-b border-hairline hover:bg-raised">
                      <td className="px-4 py-3 text-fg-soft">{t.topicName}</td>
                      <td className="px-3 py-3 font-mono text-xs text-fg-muted">{t.level}</td>
                      <td className="px-3 py-3 text-fg-muted">
                        {t.attempted}/{t.questionCount}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            'font-semibold ' +
                            (t.accuracyPct >= 70
                              ? 'text-ok'
                              : t.accuracyPct >= 40
                                ? 'text-warn'
                                : 'text-bad')
                          }
                        >
                          {t.accuracyPct}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-fg-muted">
                        {formatDuration(t.avgMsPerQuestion)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={'/practice/' + t.topicId}
                          className="text-xs font-medium text-accent-text hover:underline"
                        >
                          Practise
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Exam history. */}
      <section>
        <SectionHeading
          title="Exam history"
          icon={<History size={18} />}
          description="Every attempt is kept — retaking an exam never overwrites an earlier result."
        />
        {history.length === 0 ? (
          <EmptyState
            icon={<History size={20} />}
            title="No exam history"
            body="Each submitted exam is recorded here with its date, score and duration."
            action={
              <ButtonLink to="/exam" size="sm">
                Go to exams
              </ButtonLink>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-edge text-left">
                    {['Date', 'Exam', 'Score', 'Percent', 'Time used', ''].map((h, i) => (
                      <th
                        key={h + i}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => {
                    const topic = r.topicId ? TOPIC_BY_ID.get(r.topicId) : undefined;
                    const passed = r.pct >= data.settings.passThresholdPct;
                    return (
                      <tr key={r.id} className="border-b border-hairline hover:bg-raised">
                        <td className="px-4 py-3 text-fg-muted">{formatDateTime(r.submittedAt)}</td>
                        <td className="px-4 py-3 text-fg-soft">
                          {r.kind === 'final' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Trophy size={13} className="text-accent-text" />
                              Level {r.level} final
                            </span>
                          ) : (
                            (topic?.name ?? 'Topic exam')
                          )}
                          {r.autoSubmitted && (
                            <span className="ml-2 text-xs text-warn">auto-submitted</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-fg-muted">
                          {r.score}/{r.total}
                        </td>
                        <td className="px-4 py-3">
                          <span className={'font-semibold ' + (passed ? 'text-ok' : 'text-warn')}>
                            {r.pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">{formatDuration(r.elapsedMs)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={'/results/' + r.id}
                            className="text-xs font-medium text-accent-text hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
