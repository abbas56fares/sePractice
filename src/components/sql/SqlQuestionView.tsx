import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  Database,
  Flag,
  Info,
  Lightbulb,
  Play,
  RotateCcw,
  Terminal,
  X,
} from 'lucide-react';
import type { OptionId } from '../../types';
import type { SqlQuestion, SqlQuestionType } from '../../types/sql';
import { isExecutable } from '../../types/sql';
import { getSqlTopic } from '../../data/sql/levels';
import { getSqlDatasetFor } from '../../data/sql/questions';
import { runSql, type RunOutcome } from '../../lib/sql';
import type { GradeResult } from '../../lib/sql-grading';
import { CodeBlock } from '../CodeBlock';
import { Button, DifficultyBadge, Pill } from '../ui';
import { Modal } from '../ui/Modal';
import { SqlEditor } from './SqlEditor';
import { ResultGrid, SchemaViewer } from './SqlResultTable';

const TYPE_LABEL: Record<SqlQuestionType, string> = {
  mcq: 'Multiple choice',
  predict: 'Predict the output',
  error: 'Find the error',
  explain: 'Explain the query',
  schema: 'Schema & relationships',
  write: 'Write the query',
  complete: 'Complete the query',
};

const LETTERS: Record<OptionId, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

export function SqlQuestionMeta({ question }: { question: SqlQuestion }) {
  const topic = getSqlTopic(question.topicId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill>Level {question.levelId}</Pill>
      {topic && <Pill className="max-w-full">{topic.name}</Pill>}
      <Pill>{TYPE_LABEL[question.type]}</Pill>
      <DifficultyBadge difficulty={question.difficulty} />
      {question.dialect !== 'postgresql' && (
        <Pill className="border-info/30 bg-info/10 text-info">{question.dialect}</Pill>
      )}
      <span className="ml-auto font-mono text-[11px] text-fg-faint">{question.id}</span>
    </div>
  );
}

/** Progressive hints: one more each time the button is pressed. */
function Hints({
  hints,
  shown,
  onShowMore,
}: {
  hints: string[];
  shown: number;
  onShowMore: () => void;
}) {
  if (hints.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-2">
      {hints.slice(0, shown).map((hint, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-3"
        >
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-sm text-fg-soft">
            <span className="font-medium">Hint {i + 1}. </span>
            {hint}
          </p>
        </div>
      ))}
      {shown < hints.length && (
        <div>
          <Button variant="ghost" size="sm" onClick={onShowMore}>
            <Lightbulb size={14} />
            {shown === 0 ? 'Show a hint' : `Show hint ${shown + 1} of ${hints.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- choice view */

function ChoiceOptions({
  question,
  selected,
  onSelect,
  revealed,
  disabled,
}: {
  question: Extract<SqlQuestion, { options: unknown }>;
  selected: OptionId | undefined;
  onSelect?: (option: OptionId) => void;
  revealed: boolean;
  disabled: boolean;
}) {
  return (
    <ul className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label="Answer options">
      {question.options.map((option) => {
        const isSelected = selected === option.id;
        const isCorrect = option.id === question.answer;

        let frame = 'border-hairline bg-surface';
        let chip = 'border-edge bg-raised text-fg-muted';
        let icon: React.ReactNode = null;

        if (revealed) {
          if (isCorrect) {
            frame = 'border-ok/50 bg-ok/10';
            chip = 'border-ok/40 bg-ok/20 text-ok';
            icon = <Check size={16} className="text-ok" />;
          } else if (isSelected) {
            frame = 'border-bad/50 bg-bad/10';
            chip = 'border-bad/40 bg-bad/20 text-bad';
            icon = <X size={16} className="text-bad" />;
          } else {
            frame = 'border-hairline bg-surface opacity-70';
          }
        } else if (isSelected) {
          frame = 'border-accent bg-accent/10';
          chip = 'border-accent/40 bg-accent/20 text-accent-text';
        }

        const interactive = Boolean(onSelect) && !revealed && !disabled;

        return (
          <li key={option.id}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!interactive}
              onClick={() => onSelect?.(option.id)}
              className={
                'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left ' +
                frame +
                (interactive ? ' cursor-pointer hover:border-edge' : ' cursor-default')
              }
            >
              <span
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold ' +
                  chip
                }
              >
                {LETTERS[option.id]}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-sm text-fg-soft">
                {option.text}
              </span>
              {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------- executable view */

function ExecutableWorkspace({
  question,
  value,
  onChange,
  grade,
  onRun,
  runOutcome,
  revealed,
  disabled,
}: {
  question: Extract<SqlQuestion, { solution: string }>;
  value: string;
  onChange: (next: string) => void;
  grade: GradeResult | null;
  onRun: () => void;
  runOutcome: RunOutcome | null;
  revealed: boolean;
  disabled: boolean;
}) {
  const dataset = getSqlDatasetFor(question);
  const [schemaOpen, setSchemaOpen] = useState(false);

  const starter = question.starter ?? '';
  const errorLine = runOutcome && !runOutcome.ok ? runOutcome.errorLine : undefined;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label flex items-center gap-1.5">
          <Terminal size={12} />
          Your query
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSchemaOpen(true)}>
            <Database size={14} />
            Tables &amp; data
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(starter)}
            disabled={disabled || value === starter}
          >
            <RotateCcw size={14} />
            Reset
          </Button>
          <Button size="sm" onClick={onRun} disabled={disabled || !value.trim()}>
            <Play size={14} />
            Run
          </Button>
        </div>
      </div>

      <SqlEditor
        value={value}
        onChange={onChange}
        onRun={onRun}
        readOnly={disabled}
        {...(errorLine !== undefined ? { errorLine } : {})}
      />

      <p className="text-xs text-fg-faint">
        Dataset: <span className="font-medium text-fg-muted">{dataset.name}</span>
        {question.permission === 'read-write'
          ? ' · this exercise may modify its own copy of the data'
          : ' · read-only, so only SELECT is permitted'}
        {' · '}
        <kbd className="font-mono">Ctrl</kbd>/<kbd className="font-mono">⌘</kbd>+
        <kbd className="font-mono">Enter</kbd> runs
      </p>

      {question.expectedColumns && (
        <p className="rounded-lg border border-info/30 bg-info/10 px-3.5 py-2.5 text-sm text-fg-soft">
          <Info size={14} className="mr-1.5 inline shrink-0 text-info" />
          This exercise checks the column names. Return exactly:{' '}
          <span className="font-mono text-xs">{question.expectedColumns.join(', ')}</span>
        </p>
      )}

      {runOutcome && !runOutcome.ok && (
        <div className="rounded-lg border border-bad/40 bg-bad/10 px-3.5 py-3">
          <span className="label text-bad">Query failed</span>
          <p className="mt-1 text-sm text-fg-soft">{runOutcome.error}</p>
          {runOutcome.errorLine !== undefined && (
            <p className="mt-1 text-xs text-fg-faint">Around line {runOutcome.errorLine}.</p>
          )}
        </div>
      )}

      {runOutcome?.ok && runOutcome.result && (
        <ResultGrid
          result={runOutcome.result}
          caption="Your result"
          {...(runOutcome.truncated ? { truncated: true } : {})}
          {...(runOutcome.totalRows !== undefined ? { totalRows: runOutcome.totalRows } : {})}
        />
      )}

      {grade && !grade.correct && grade.detail && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-3.5 py-3">
          <span className="label text-warn">What is different</span>
          <p className="mt-1 text-sm text-fg-soft">{grade.detail}</p>
        </div>
      )}

      {revealed && grade?.expected && (
        <ResultGrid result={grade.expected} caption="Expected result" />
      )}

      <Modal
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        title={dataset.name + ' dataset'}
        footer={<Button onClick={() => setSchemaOpen(false)}>Close</Button>}
      >
        <SchemaViewer tables={dataset.tables} description={dataset.description} />
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- view */

export interface SqlAnswerState {
  option?: OptionId;
  sql?: string;
}

/**
 * One SQL question, in either of its two shapes.
 *
 * `revealed` is the single switch between practice and exam behaviour, as in
 * the Java question view: while it is false nothing on screen hints at the
 * answer. Running a query is still allowed during an exam — that is the
 * learner testing their own work, not the app leaking the answer, since the
 * expected result stays hidden until the question is revealed.
 */
export function SqlQuestionView({
  question,
  answer,
  onAnswer,
  revealed,
  grade,
  flagged,
  onToggleFlag,
  hintsShown,
  onShowHint,
  disabled = false,
  hintsEnabled = true,
}: {
  question: SqlQuestion;
  answer: SqlAnswerState;
  onAnswer: (next: SqlAnswerState) => void;
  revealed: boolean;
  /** Set once an executable answer has been submitted. */
  grade?: GradeResult | null;
  flagged?: boolean;
  onToggleFlag?: () => void;
  hintsShown?: number;
  onShowHint?: () => void;
  disabled?: boolean;
  hintsEnabled?: boolean;
}) {
  const [runOutcome, setRunOutcome] = useState<RunOutcome | null>(null);
  const dataset = useMemo(() => getSqlDatasetFor(question), [question]);

  const sql = answer.sql ?? (isExecutable(question) ? (question.starter ?? '') : '');

  const run = useCallback(() => {
    if (!isExecutable(question)) return;
    setRunOutcome(
      runSql(dataset, sql, { permission: question.permission ?? 'read-only' })
    );
  }, [dataset, question, sql]);

  return (
    <div>
      <SqlQuestionMeta question={question} />

      <h2 className="mt-4 text-base font-semibold leading-relaxed text-fg md:text-lg">
        {question.prompt}
      </h2>

      {question.code && <CodeBlock code={question.code} lang="sql" />}

      {question.dialectNote && (
        <p className="mt-3 rounded-lg border border-info/30 bg-info/10 px-3.5 py-2.5 text-sm text-fg-soft">
          <Info size={14} className="mr-1.5 inline shrink-0 text-info" />
          {question.dialectNote}
        </p>
      )}

      {!revealed && hintsEnabled && (
        <Hints
          hints={question.hints}
          shown={hintsShown ?? 0}
          onShowMore={() => onShowHint?.()}
        />
      )}

      {isExecutable(question) ? (
        <ExecutableWorkspace
          question={question}
          value={sql}
          onChange={(next) => onAnswer({ ...answer, sql: next })}
          grade={grade ?? null}
          onRun={run}
          runOutcome={runOutcome}
          revealed={revealed}
          disabled={disabled || revealed}
        />
      ) : (
        <ChoiceOptions
          question={question}
          selected={answer.option}
          onSelect={(option) => onAnswer({ ...answer, option })}
          revealed={revealed}
          disabled={disabled}
        />
      )}

      {onToggleFlag && (
        <div className="mt-4">
          <Button
            variant={flagged ? 'danger' : 'ghost'}
            size="sm"
            onClick={onToggleFlag}
            aria-pressed={flagged}
          >
            <Flag size={14} />
            {flagged ? 'Flagged for review' : 'Flag for review'}
          </Button>
        </div>
      )}

      {revealed && <SqlExplanation question={question} answer={answer} grade={grade ?? null} />}
    </div>
  );
}

export function SqlExplanation({
  question,
  answer,
  grade,
}: {
  question: SqlQuestion;
  answer: SqlAnswerState;
  grade: GradeResult | null;
}) {
  const executable = isExecutable(question);
  const wasCorrect = executable ? Boolean(grade?.correct) : answer.option === (question as { answer: OptionId }).answer;
  const unanswered = executable ? !answer.sql?.trim() : answer.option === undefined;

  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <div
        className={
          'flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium ' +
          (unanswered
            ? 'border-warn/30 bg-warn/10 text-warn'
            : wasCorrect
              ? 'border-ok/30 bg-ok/10 text-ok'
              : 'border-bad/30 bg-bad/10 text-bad')
        }
      >
        {unanswered ? (
          <>
            <Flag size={15} className="mt-0.5 shrink-0" />
            <span>Not answered.</span>
          </>
        ) : wasCorrect ? (
          <>
            <Check size={15} className="mt-0.5 shrink-0" />
            <span>Correct</span>
          </>
        ) : (
          <>
            <X size={15} className="mt-0.5 shrink-0" />
            <span>{executable ? (grade?.detail ?? 'Not quite.') : 'Incorrect'}</span>
          </>
        )}
      </div>

      {!executable && (
        <>
          <div className="mt-4">
            <h3 className="label">
              Why {LETTERS[(question as { answer: OptionId }).answer]} is right
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">{question.explanation}</p>
          </div>

          <div className="mt-5">
            <h3 className="label">Why the others are wrong</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {(question as { options: { id: OptionId; text: string }[] }).options
                .filter((o) => o.id !== (question as { answer: OptionId }).answer)
                .map((o) => (
                  <li key={o.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-hairline bg-raised font-mono text-[10px] font-semibold text-fg-faint">
                      {LETTERS[o.id]}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg-muted">
                      {(question as { whyWrong: Partial<Record<OptionId, string>> }).whyWrong[
                        o.id
                      ] ?? 'No explanation recorded for this option.'}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}

      {executable && (
        <>
          <div className="mt-4">
            <h3 className="label">How it works</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">{question.explanation}</p>
          </div>
          <div className="mt-5">
            <h3 className="label">One correct solution</h3>
            <p className="mt-1 text-xs text-fg-faint">
              Grading compares results, not text — a different query returning the same rows is
              equally correct.
            </p>
            <CodeBlock code={(question as { solution: string }).solution} lang="sql" />
          </div>
        </>
      )}

      {question.hints.length > 0 && (
        <div className="mt-5">
          <h3 className="label">Hints</h3>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
            {question.hints.map((hint, i) => (
              <li key={i} className="text-sm text-fg-muted">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
