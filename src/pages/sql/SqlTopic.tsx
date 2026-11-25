import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Database,
  Info,
  Link2,
  Terminal,
} from 'lucide-react';
import type { LessonExample } from '../../types/sql';
import { useApp } from '../../state/AppContext';
import { getSqlTopic } from '../../data/sql/levels';
import { getLesson } from '../../data/sql/lessons';
import { datasetOr } from '../../data/sql/datasets';
import { sqlQuestionsForTopic } from '../../data/sql/questions';
import { isExecutable } from '../../types/sql';
import { sqlTopicProgress } from '../../lib/sql-progress';
import { runSql } from '../../lib/sql';
import { CodeBlock } from '../../components/CodeBlock';
import { DataTable, ResultGrid } from '../../components/sql/SqlResultTable';
import {
  Button,
  ButtonLink,
  Card,
  DifficultyBadge,
  Pill,
  ProgressBar,
  SectionHeading,
} from '../../components/ui';
import { NotFound } from '../NotFound';

/**
 * A worked example, executed live.
 *
 * Nothing here is a transcribed result: the SQL runs against the dataset when
 * the lesson renders, so an example cannot drift out of step with the data or
 * the engine, and an example that is meant to fail shows the real error.
 */
function Example({ example, datasetId }: { example: LessonExample; datasetId: string }) {
  const dataset = datasetOr(example.datasetId ?? datasetId);
  const outcome = useMemo(
    () => runSql(dataset, example.sql, { permission: 'read-write', maxDisplayRows: 30 }),
    [dataset, example.sql]
  );

  return (
    <div className="border-t border-hairline pt-5 first:border-0 first:pt-0">
      <h4 className="text-sm font-semibold text-fg">{example.caption}</h4>

      {example.showTables && (
        <div className="mt-3 flex flex-col gap-3">
          {example.showTables.map((name) => {
            const table = dataset.tables.find((t) => t.name === name);
            return table ? <DataTable key={name} table={table} /> : null;
          })}
        </div>
      )}

      <CodeBlock code={example.sql} lang="sql" showLineNumbers={false} />

      {outcome.ok && outcome.result ? (
        <ResultGrid
          result={outcome.result}
          caption="Result"
          maxHeight={260}
          {...(outcome.truncated ? { truncated: true } : {})}
          {...(outcome.totalRows !== undefined ? { totalRows: outcome.totalRows } : {})}
        />
      ) : (
        <div
          className={
            'rounded-lg border px-3.5 py-3 ' +
            (example.expectError ? 'border-warn/40 bg-warn/10' : 'border-bad/40 bg-bad/10')
          }
        >
          <span className={'label ' + (example.expectError ? 'text-warn' : 'text-bad')}>
            {example.expectError ? 'This is the error — that is the point' : 'Query failed'}
          </span>
          <p className="mt-1 font-mono text-xs text-fg-soft">{outcome.error}</p>
        </div>
      )}

      {example.note && <p className="mt-3 text-sm leading-relaxed text-fg-muted">{example.note}</p>}
    </div>
  );
}

export function SqlTopicPage() {
  const { topicId } = useParams();
  const { data, dispatch } = useApp();
  const [showAll, setShowAll] = useState(false);

  const topic = topicId ? getSqlTopic(topicId) : undefined;
  const lesson = topicId ? getLesson(topicId) : undefined;

  const progress = useMemo(() => (topic ? sqlTopicProgress(data, topic) : null), [data, topic]);
  const questions = useMemo(() => (topic ? sqlQuestionsForTopic(topic.id) : []), [topic]);

  if (!topic || !progress) return <NotFound />;

  const exercises = questions.filter(isExecutable);
  const visibleExamples = lesson ? (showAll ? lesson.examples : lesson.examples.slice(0, 3)) : [];
  const dataset = datasetOr(topic.datasetId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Link
        to={'/sql/level/' + topic.levelId}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={15} />
        Back to SQL Level {topic.levelId}
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label">
            SQL Level {topic.levelId} &middot; Topic {topic.order}
          </span>
          <DifficultyBadge difficulty={topic.difficulty} />
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg md:text-3xl">{topic.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          {topic.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {topic.concepts.map((c) => (
            <Pill key={c} className="font-mono">
              {c}
            </Pill>
          ))}
        </div>
      </div>

      {/* Progress and the two ways in. */}
      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <ProgressBar
            value={progress.completionPct}
            tone={progress.status === 'completed' ? 'ok' : 'accent'}
            label={topic.name + ' completion'}
          />
          <p className="mt-2 text-xs text-fg-faint">
            {progress.attempted}/{progress.questionCount} questions attempted
            {progress.attempted > 0 && ` · ${progress.accuracyPct}% accuracy`}
            {progress.bestScorePct > 0 && ` · best exam ${progress.bestScorePct}%`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <ButtonLink to={'/sql/practice/' + topic.id} size="sm">
            Practise {progress.questionCount} questions
            <ArrowRight size={14} />
          </ButtonLink>
          {exercises.length > 0 && (
            <ButtonLink
              to={'/sql/practice/' + topic.id + '?only=exercises'}
              variant="secondary"
              size="sm"
            >
              <Terminal size={14} />
              {exercises.length} exercises
            </ButtonLink>
          )}
          <ButtonLink to={'/sql/exam/start/topic/' + topic.id} variant="secondary" size="sm">
            Topic exam
          </ButtonLink>
        </div>
      </Card>

      {lesson ? (
        <>
          <section>
            <SectionHeading title="The idea" icon={<BookOpen size={18} />} />
            <Card className="p-5 md:p-6">
              <p className="text-sm leading-relaxed text-fg-soft md:text-base">
                {lesson.definition}
              </p>

              {lesson.syntax && (
                <div className="mt-4">
                  <span className="label">Syntax</span>
                  <CodeBlock code={lesson.syntax} lang="sql" showLineNumbers={false} />
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Worked examples"
              icon={<Database size={18} />}
              description={`Run live against the ${dataset.name} dataset as this page loads — nothing here is transcribed.`}
            />
            <Card className="flex flex-col gap-5 p-5 md:p-6">
              {visibleExamples.map((example, i) => (
                <Example key={i} example={example} datasetId={topic.datasetId} />
              ))}

              {lesson.examples.length > 3 && (
                <div className="border-t border-hairline pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setShowAll((s) => !s)}>
                    {showAll
                      ? 'Show fewer examples'
                      : `Show ${lesson.examples.length - 3} more example${lesson.examples.length - 3 === 1 ? '' : 's'}`}
                  </Button>
                </div>
              )}
            </Card>
          </section>

          {lesson.pitfalls.length > 0 && (
            <section>
              <SectionHeading title="Common mistakes" icon={<AlertTriangle size={18} />} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {lesson.pitfalls.map((pitfall) => (
                  <Card key={pitfall.title} className="p-4">
                    <h3 className="flex items-start gap-2 text-sm font-semibold text-fg">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn" />
                      {pitfall.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{pitfall.body}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {lesson.dialectNotes && lesson.dialectNotes.length > 0 && (
            <section>
              <SectionHeading
                title="On other engines"
                icon={<Info size={18} />}
                description="This module teaches PostgreSQL. Where another engine differs meaningfully, it is called out."
              />
              <Card className="divide-y divide-hairline">
                {lesson.dialectNotes.map((note) => (
                  <div key={note.engine} className="flex gap-3 p-4">
                    <Pill className="h-fit shrink-0">{note.engine}</Pill>
                    <p className="text-sm text-fg-muted">{note.note}</p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {lesson.related.length > 0 && (
            <section>
              <SectionHeading title="Related topics" icon={<Link2 size={18} />} />
              <div className="flex flex-wrap gap-2">
                {lesson.related.map((id) => {
                  const related = getSqlTopic(id);
                  return related ? (
                    <ButtonLink key={id} to={'/sql/topic/' + id} variant="secondary" size="sm">
                      {related.name}
                      <ArrowRight size={13} />
                    </ButtonLink>
                  ) : null;
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-fg-muted">
            No written lesson for this topic yet — the practice set and its explanations cover the
            same ground.
          </p>
        </Card>
      )}

      {/* Mark as read, and move on. */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">
            {progress.lessonRead ? 'You have marked this lesson as read' : 'Finished reading?'}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            Marking it read is only a bookmark — it does not affect your scores.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            variant={progress.lessonRead ? 'secondary' : 'primary'}
            size="sm"
            onClick={() =>
              dispatch({
                type: 'sql:lesson-read',
                topicId: topic.id,
                read: !progress.lessonRead,
              })
            }
          >
            <Check size={14} />
            {progress.lessonRead ? 'Mark as unread' : 'Mark as read'}
          </Button>
          <ButtonLink to={'/sql/practice/' + topic.id} size="sm">
            Start practising
            <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
