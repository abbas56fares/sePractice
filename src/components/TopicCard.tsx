import { Lock, Play, Timer, Trophy } from 'lucide-react';
import type { TopicProgress } from '../lib/progress';
import { Button, ButtonLink, Card, DifficultyBadge, ProgressBar, StatusBadge } from './ui';

/**
 * One roadmap entry. Every level renders through this component, so Levels 1,
 * 2 and 3 are visually identical and only their content differs — which is the
 * whole point of a shared roadmap layout.
 */
export function TopicCard({ progress }: { progress: TopicProgress }) {
  const { topic, status } = progress;
  const locked = status === 'locked';

  return (
    <Card className={'flex flex-col p-4 md:p-5' + (locked ? ' opacity-75' : '')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold ' +
              (topic.isFinal
                ? 'border-accent/30 bg-accent/10 text-accent-text'
                : 'border-hairline bg-raised text-fg-muted')
            }
          >
            {topic.isFinal ? <Trophy size={14} /> : topic.order}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-fg md:text-base">
              {topic.name}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted md:text-sm">
              {topic.description}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        <DifficultyBadge difficulty={topic.difficulty} />
        <span>
          <span className="font-semibold text-fg-soft">{progress.questionCount}</span> questions
        </span>
        <span>
          Best score{' '}
          <span
            className={
              'font-semibold ' + (progress.bestScorePct > 0 ? 'text-fg-soft' : 'text-fg-faint')
            }
          >
            {progress.bestScorePct > 0 ? progress.bestScorePct + '%' : '--'}
          </span>
        </span>
        {progress.attemptCount > 0 && (
          <span>
            {progress.attemptCount} exam{progress.attemptCount === 1 ? '' : 's'} taken
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-fg-faint">
            {topic.isFinal ? 'Level coverage' : 'Questions attempted'}
          </span>
          <span className="font-medium text-fg-muted">
            {progress.attempted}/{progress.questionCount} &middot; {progress.completionPct}%
          </span>
        </div>
        <ProgressBar
          value={progress.completionPct}
          tone={status === 'completed' ? 'ok' : 'accent'}
          label={topic.name + ' completion'}
        />
      </div>

      {locked ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-hairline bg-raised px-3 py-2.5">
          <Lock size={14} className="mt-0.5 shrink-0 text-fg-faint" />
          <p className="text-xs leading-relaxed text-fg-muted">{progress.lockReason}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {!topic.isFinal && (
            <ButtonLink
              to={'/practice/' + topic.id}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              <Play size={14} />
              Start practice
            </ButtonLink>
          )}
          <ButtonLink
            to={'/exam/start/' + topic.id}
            variant={topic.isFinal ? 'primary' : 'secondary'}
            size="sm"
            className="flex-1"
          >
            <Timer size={14} />
            {topic.isFinal ? 'Start final exam' : 'Start exam'}
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}

/** Compact variant for the dashboard's three level cards. */
export function LevelCardActions({
  levelId,
  unlocked,
  onLockedClick,
}: {
  levelId: number;
  unlocked: boolean;
  onLockedClick: () => void;
}) {
  if (!unlocked) {
    return (
      <Button variant="secondary" size="sm" onClick={onLockedClick} className="w-full">
        <Lock size={14} />
        Locked
      </Button>
    );
  }
  return (
    <ButtonLink to={'/level/' + levelId} variant="secondary" size="sm" className="w-full">
      Open level
    </ButtonLink>
  );
}
