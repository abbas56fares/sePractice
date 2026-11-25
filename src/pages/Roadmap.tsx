import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Map as MapIcon } from 'lucide-react';
import { useApp, asLevelId } from '../state/AppContext';
import { allLevelProgress, levelProgress } from '../lib/progress';
import { LEVELS } from '../data/levels';
import { pct } from '../lib/format';
import { TopicCard } from '../components/TopicCard';
import { ButtonLink, Card, ProgressBar, ProgressRing, SectionHeading } from '../components/ui';
import { NotFound } from './NotFound';

/** Shared header used by both the roadmap and the level-detail page. */
function LevelHeader({ levelId }: { levelId: 1 | 2 | 3 }) {
  const { data } = useApp();
  const progress = levelProgress(data, levelId);
  const def = LEVELS.find((l) => l.id === levelId);

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="label">Level {levelId}</span>
            {!progress.unlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-edge bg-raised px-2 py-0.5 text-[11px] text-fg-faint">
                <Lock size={10} /> Locked
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-fg md:text-2xl">
            {def?.name} &middot; {def?.tagline}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
            {def?.description}
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
          label={'Level ' + levelId + ' progress'}
        />
      </div>
    </Card>
  );
}

/** All three roadmaps on one page, rendered through the same components. */
export function Roadmap() {
  const { data } = useApp();
  const levels = useMemo(() => allLevelProgress(data), [data]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
          Assessment roadmap
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Three levels, eight stages each: seven topic modules followed by a timed final exam.
          Practise any available topic freely; exams are what move the progress bars.
        </p>
      </div>

      {levels.map((level) => (
        <section key={level.level} className="flex flex-col gap-5">
          <LevelHeader levelId={level.level} />

          <SectionHeading
            title={`Level ${level.level} topics`}
            icon={<MapIcon size={18} />}
            description="Each card shows difficulty, question count, completion and your best score."
            action={
              <ButtonLink to={'/level/' + level.level} variant="secondary" size="sm">
                Level detail
                <ArrowRight size={14} />
              </ButtonLink>
            }
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 md:gap-5">
            {level.topics.map((t) => (
              <TopicCard key={t.topic.id} progress={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LevelDetails() {
  const { levelId } = useParams();
  const { data } = useApp();
  const id = asLevelId(levelId);

  if (id === null) return <NotFound />;

  const progress = levelProgress(data, id);
  const prev = id > 1 ? id - 1 : null;
  const next = id < 3 ? id + 1 : null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={15} />
          All levels
        </Link>
        <div className="flex items-center gap-2">
          {prev && (
            <ButtonLink to={'/level/' + prev} variant="secondary" size="sm">
              <ArrowLeft size={14} />
              Level {prev}
            </ButtonLink>
          )}
          {next && (
            <ButtonLink to={'/level/' + next} variant="secondary" size="sm">
              Level {next}
              <ArrowRight size={14} />
            </ButtonLink>
          )}
        </div>
      </div>

      <LevelHeader levelId={id} />

      <section>
        <SectionHeading
          title="Topic modules"
          icon={<MapIcon size={18} />}
          description={`Work down the list, then sit the final exam. ${data.settings.unlockMode === 'gated' ? `A ${data.settings.passThresholdPct}% topic-exam score marks a topic complete, and a ${data.settings.passThresholdPct}% average across them opens the final.` : 'Progression gating is currently off, so everything is unlocked.'}`}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 md:gap-5">
          {progress.topics.map((t) => (
            <TopicCard key={t.topic.id} progress={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
