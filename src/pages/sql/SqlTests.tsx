import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, Lock, Timer, Trophy } from 'lucide-react';
import type { SqlExamConfig } from '../../types/sql';
import { useApp } from '../../state/AppContext';
import { SQL_FINAL_EXAMS, SQL_MOCK_TESTS } from '../../data/sql/exams';
import { SQL_LEVELS } from '../../data/sql/levels';
import { availableForConfig } from '../../lib/sql-exam';
import {
  bestConfigScore,
  configAttempts,
  isSqlFinalUnlocked,
  sqlLevelProgress,
} from '../../lib/sql-progress';
import { ButtonLink, Card, Pill, SectionHeading } from '../../components/ui';

function ExamRow({ config, locked, lockReason }: { config: SqlExamConfig; locked: boolean; lockReason?: string }) {
  const { data } = useApp();
  const best = bestConfigScore(data, config.id);
  const attempts = configAttempts(data, config.id);
  const available = availableForConfig(config);
  const passed = best >= config.passPct;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {config.kind === 'final' ? (
            <Trophy size={14} className="shrink-0 text-accent-text" />
          ) : (
            <ClipboardList size={14} className="shrink-0 text-fg-faint" />
          )}
          <span className="truncate text-sm font-medium text-fg">{config.name}</span>
          {passed && <CheckCircle2 size={14} className="shrink-0 text-ok" />}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">{config.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
          <span>
            {available} questions &middot; {config.durationMinutes} min &middot; pass{' '}
            {config.passPct}%
          </span>
          <span>Best {best > 0 ? best + '%' : '--'}</span>
          {attempts > 0 && (
            <span>
              {attempts} attempt{attempts === 1 ? '' : 's'}
            </span>
          )}
          {config.levelMix && (
            <span>
              Mix:{' '}
              {Object.entries(config.levelMix)
                .map(([l, n]) => `L${l}×${n}`)
                .join(' · ')}
            </span>
          )}
        </div>
      </div>

      {locked ? (
        <div className="shrink-0 sm:max-w-xs">
          <Pill>
            <Lock size={11} />
            Locked
          </Pill>
          {lockReason && <p className="mt-1 text-xs text-fg-faint">{lockReason}</p>}
        </div>
      ) : (
        <ButtonLink
          to={'/sql/exam/start/' + config.id}
          variant={config.kind === 'final' ? 'primary' : 'secondary'}
          size="sm"
          className="shrink-0"
        >
          {attempts > 0 ? 'Sit again' : 'Start'}
        </ButtonLink>
      )}
    </div>
  );
}

export function SqlTests() {
  const { data } = useApp();
  const levels = useMemo(() => SQL_LEVELS.map((l) => sqlLevelProgress(data, l.id)), [data]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link to="/sql" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} />
        Back to the SQL dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
          Mock tests &amp; final exams
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Both are timed, submit automatically when the clock runs out, and survive a refresh.
          Mock tests are unlocked from the start and can be re-sat freely; final exams are the
          graded capstones and open once you have worked through their level.
        </p>
      </div>

      <section>
        <SectionHeading
          title="Mock tests"
          icon={<ClipboardList size={18} />}
          description="Practice papers. Sit them as often as you like — every attempt is recorded in your history."
        />
        <Card className="divide-y divide-hairline">
          {SQL_MOCK_TESTS.map((config) => (
            <ExamRow key={config.id} config={config} locked={false} />
          ))}
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Final exams"
          icon={<Trophy size={18} />}
          description="The graded capstones. A level final opens on the average of that level's topic exams."
        />
        <Card className="divide-y divide-hairline">
          {SQL_FINAL_EXAMS.map((config) => {
            if (config.levelId === null) {
              // The comprehensive paper opens once every level final is passed.
              const ready = levels.every(
                (l) => l.finalBestPct >= data.settings.passThresholdPct
              );
              const unlocked = ready || data.settings.unlockMode === 'open';
              return (
                <ExamRow
                  key={config.id}
                  config={config}
                  locked={!unlocked}
                  {...(unlocked
                    ? {}
                    : {
                        lockReason: `Pass all three level finals to unlock, or switch to open mode in Settings.`,
                      })}
                />
              );
            }

            const unlocked = isSqlFinalUnlocked(data, config.levelId);
            const average = levels[config.levelId - 1];
            return (
              <ExamRow
                key={config.id}
                config={config}
                locked={!unlocked}
                {...(unlocked
                  ? {}
                  : {
                      lockReason: `Average ${data.settings.passThresholdPct}% across the Level ${config.levelId} topic exams to unlock. Currently ${Math.round(
                        (average?.topics.reduce((n, t) => n + t.bestScorePct, 0) ?? 0) /
                          Math.max(1, average?.topics.length ?? 1)
                      )}%.`,
                    })}
              />
            );
          })}
        </Card>
      </section>

      <section>
        <SectionHeading title="Topic exams" icon={<Timer size={18} />} description="Short, focused papers — one per topic, opened from the topic itself." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {levels.map((level) => (
            <Card key={level.levelId} className="p-5">
              <span className="label">Level {level.levelId}</span>
              <h3 className="mt-0.5 text-base font-semibold text-fg">{level.name}</h3>
              <p className="mt-1 text-sm text-fg-muted">
                {level.topicsTotal} topic exams, {data.settings.sqlTopicExamQuestions} questions in{' '}
                {data.settings.sqlTopicExamMinutes} minutes each.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {level.topics.map((t) => (
                  <li key={t.topic.id} className="flex items-center justify-between gap-2 text-xs">
                    <Link
                      to={'/sql/exam/start/topic/' + t.topic.id}
                      className="min-w-0 flex-1 truncate text-fg-muted hover:text-fg"
                    >
                      {t.topic.name}
                    </Link>
                    <span
                      className={
                        'shrink-0 font-mono ' +
                        (t.bestScorePct >= data.settings.passThresholdPct
                          ? 'text-ok'
                          : 'text-fg-faint')
                      }
                    >
                      {t.bestScorePct > 0 ? t.bestScorePct + '%' : '--'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
