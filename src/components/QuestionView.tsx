import { Check, Flag, Lightbulb, X } from 'lucide-react';
import type { OptionId, Question, QuestionKind } from '../types';
import { TOPIC_BY_ID } from '../data/levels';
import { CodeBlock } from './CodeBlock';
import { Button, DifficultyBadge, Pill } from './ui';

const KIND_LABEL: Record<QuestionKind, string> = {
  output: 'Predict the output',
  concept: 'Concept',
  compile: 'Compiles?',
  bug: 'Find the bug',
  complexity: 'Complexity',
  sql: 'SQL',
  react: 'React',
};

export function QuestionMeta({ question }: { question: Question }) {
  const topic = TOPIC_BY_ID.get(question.topicId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill>Level {question.level}</Pill>
      {topic && <Pill className="max-w-full">{topic.name}</Pill>}
      <Pill>{KIND_LABEL[question.kind]}</Pill>
      <DifficultyBadge difficulty={question.difficulty} />
      <span className="ml-auto font-mono text-[11px] text-fg-faint">{question.id}</span>
    </div>
  );
}

const LETTERS: Record<OptionId, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

/**
 * One question: metadata, prompt, optional snippet, and the four options.
 *
 * `revealed` is the single switch between the two behaviours the app needs.
 * While it is false nothing on screen hints at the answer — that is what keeps
 * exam mode honest. Once true, the keyed answer, the reasoning and a rebuttal
 * for every distractor are shown together.
 */
export function QuestionView({
  question,
  selected,
  onSelect,
  revealed,
  flagged,
  onToggleFlag,
  hintVisible,
  onShowHint,
  disabled = false,
}: {
  question: Question;
  selected: OptionId | undefined;
  onSelect?: (option: OptionId) => void;
  revealed: boolean;
  flagged?: boolean;
  onToggleFlag?: () => void;
  hintVisible?: boolean;
  onShowHint?: () => void;
  disabled?: boolean;
}) {
  const correct = question.answer;

  return (
    <div>
      <QuestionMeta question={question} />

      <h2 className="mt-4 text-base font-semibold leading-relaxed text-fg md:text-lg">
        {question.prompt}
      </h2>

      {question.code && <CodeBlock code={question.code} lang={question.codeLang ?? 'java'} />}

      {!revealed && question.hint && (
        <div className="mt-4">
          {hintVisible ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-3">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-sm text-fg-soft">{question.hint}</p>
            </div>
          ) : (
            onShowHint && (
              <Button variant="ghost" size="sm" onClick={onShowHint}>
                <Lightbulb size={14} />
                Show hint
              </Button>
            )
          )}
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-2.5" role="radiogroup" aria-label="Answer options">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = option.id === correct;

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
                  (interactive ? ' hover:border-edge' : '') +
                  (interactive ? ' cursor-pointer' : ' cursor-default')
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

      {revealed && <Explanation question={question} selected={selected} />}
    </div>
  );
}

export function Explanation({
  question,
  selected,
}: {
  question: Question;
  selected: OptionId | undefined;
}) {
  const wasCorrect = selected === question.answer;
  const distractors = question.options.filter((o) => o.id !== question.answer);

  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <div
        className={
          'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium ' +
          (selected === undefined
            ? 'border-warn/30 bg-warn/10 text-warn'
            : wasCorrect
              ? 'border-ok/30 bg-ok/10 text-ok'
              : 'border-bad/30 bg-bad/10 text-bad')
        }
      >
        {selected === undefined ? (
          <>
            <Flag size={15} /> Not answered &mdash; the correct answer is{' '}
            {LETTERS[question.answer]}
          </>
        ) : wasCorrect ? (
          <>
            <Check size={15} /> Correct
          </>
        ) : (
          <>
            <X size={15} /> Incorrect &mdash; the correct answer is {LETTERS[question.answer]}
          </>
        )}
      </div>

      <div className="mt-4">
        <h3 className="label">Why {LETTERS[question.answer]} is right</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">{question.explanation}</p>
      </div>

      <div className="mt-5">
        <h3 className="label">Why the others are wrong</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {distractors.map((o) => (
            <li key={o.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-hairline bg-raised font-mono text-[10px] font-semibold text-fg-faint">
                {LETTERS[o.id]}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg-muted">
                {question.whyWrong[o.id] ?? 'No explanation recorded for this option.'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {question.hint && (
        <div className="mt-5">
          <h3 className="label">Hint</h3>
          <p className="mt-1.5 text-sm text-fg-muted">{question.hint}</p>
        </div>
      )}
    </div>
  );
}
