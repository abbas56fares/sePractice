import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Lock, Terminal, Trophy } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { asSqlLevelId } from '../../data/sql/levels';
import { finalExamForLevel } from '../../data/sql/exams';
import { sqlQuestionsForTopic } from '../../data/sql/questions';
import { isExecutable } from '../../types/sql';
import type { SqlTopicProgress } from '../../lib/sql-progress';
import { sqlLevelProgress } from '../../lib/sql-progress';
import { pct } from '../../lib/format';
import {
  ButtonLink,
  Card,
  DifficultyBadge,
  Pill,
  ProgressBar,
  ProgressRing,
  SectionHeading,
  StatusBadge,
} from '../../components/ui';
import { NotFound } from '../NotFound';

function TopicCard({ progress }: { progress: SqlTopicProgress }) {
  const { topic, status } = progress;
  const locked = status === 'locked';
  const exercises = sqlQuestionsForTopic(topic.id).filter(isExecutable).length;

  return (
    <Card className={'flex flex-col p-5 ' + (locked ? 'opacity-70' : '')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label">Topic {topic.order}</span>
          <h3 className="mt-0.5 text-base font-semibold text-fg">{topic.name}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{topic.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <DifficultyBadge difficulty={topic.difficulty} />
        <Pill>{progress.questionCount} questions</Pill>
        <Pill>
          <Terminal size={11} />
          {exercises} to write
        </Pill>
        {progress.lessonRead && (
          <Pill className="border-ok/30 bg-ok/10 text-ok">
            <BookOpen size={11} />
            Lesson read
          </Pill>
        )}
      </div>

      <div className="mt-4">
        <ProgressBar
          value={progress.completionPct}
          tone={status === 'completed' ? 'ok' : 'accent'}
          label={topic.name + ' completion'}
        />
        <p className="mt-1.5 text-xs text-fg-faint">
          {progress.attempted}/{progress.questionCount} attempted
          {progress.attempted > 0 && ` · ${progress.accuracyPct}% accuracy`}
          {progress.bestScorePct > 0 && ` · best exam ${progress.bestScorePct}%`}
        </p>
      </div>

      {locked ? (
        <p className="mt-4 rounded-lg border border-hairline bg-raised px-3 py-2.5 text-xs text-fg-muted">
          <Lock size={11} className="mr-1 inline" />
          {progress.lockReason}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <ButtonLink to={'/sql/topic/' + topic.id} size="sm" className="flex-1">
            <BookOpen size={14} />
            Lesson
          </ButtonLink>
          <ButtonLink
            to={'/sql/practice/' + topic.id}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            Practise
          </ButtonLink>
          <ButtonLink
            to={'/sql/exam/start/topic/' + topic.id}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            Exam
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}

export function SqlLevelPage() {
  const { levelId } = useParams();
  const { data } = useApp();
  const id = asSqlLevelId(levelId);

  const progress = useMemo(() => (id === null ? null : sqlLevelProgress(data, id)), [data, id]);

  if (id === null || !progress) return <NotFound />;

  const final = finalExamForLevel(id);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="label">SQL Level {id}</span>
              {!progress.unlocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-edge bg-raised px-2 py-0.5 text-[11px] text-fg-faint">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">
              {progress.name} &middot; {progress.tagline}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
              {progress.description}
            </p>
          </div>
          <ProgressRing value={progress.completionPct} size={72} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-5 sm:grid-cols-4">
          {[
            { label: 'Topics complete', value: `${progress.topicsCompleted}/${progress.topicsTotal}` },
            { label: 'Questions attempted', value: `${progress.attempted}/${progress.questionCount}` },
            {
              label: 'Accuracy',
              value: progress.attempted === 0 ? '--' : pct(progress.accuracyPct),
            },
            {
              label: 'Final exam best',
              value: progress.finalBestPct > 0 ? pct(progress.finalBestPct) : '--',
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="label">{item.label}</dt>
              <dd className="mt-1 text-lg font-bold text-fg">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <ProgressBar
            value={progress.completionPct}
            tone={progress.topicsCompleted === progress.topicsTotal ? 'ok' : 'accent'}
            label={'SQL Level ' + id + ' progress'}
          />
        </div>
      </Card>

      <section>
        <SectionHeading
          title={`Level ${id} topics`}
          icon={<BookOpen size={18} />}
          description="Each topic has a lesson, a practice set with query-writing exercises, and a timed exam."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 md:gap-5">
          {progress.topics.map((t) => (
            <TopicCard key={t.topic.id} progress={t} />
          ))}
        </div>
      </section>

      {final && (
        <section>
          <SectionHeading title="Level capstone" icon={<Trophy size={18} />} />
          <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-fg">{final.name}</h3>
              <p className="mt-1 max-w-2xl text-sm text-fg-muted">{final.description}</p>
              <p className="mt-2 text-xs text-fg-faint">
                {final.questionCount} questions · {final.durationMinutes} min · pass {final.passPct}%
                {progress.finalBestPct > 0 && ` · best ${progress.finalBestPct}%`}
              </p>
            </div>
            {progress.finalUnlocked ? (
              <ButtonLink to={'/sql/exam/start/' + final.id} className="shrink-0">
                Start the final
                <ArrowRight size={15} />
              </ButtonLink>
            ) : (
              <div className="shrink-0 rounded-lg border border-hairline bg-raised px-3.5 py-2.5 text-xs text-fg-muted md:max-w-xs">
                <Lock size={11} className="mr-1 inline" />
                Average {data.settings.passThresholdPct}% or more across this level&rsquo;s topic
                exams to unlock the final. Currently{' '}
                {Math.round(
                  progress.topics.reduce((n, t) => n + t.bestScorePct, 0) /
                    Math.max(1, progress.topics.length)
                )}
                %.
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
