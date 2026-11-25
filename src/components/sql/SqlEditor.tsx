import { useCallback, useEffect, useRef } from 'react';
import { highlightLines } from '../../lib/highlight';

/**
 * Lightweight SQL editor.
 *
 * A transparent textarea sitting exactly on top of a highlighted copy of the
 * same text. That gives real syntax colouring, native text selection, native
 * mobile keyboards and full accessibility for about eighty lines — rather
 * than the ~300KB a full editor component would add to a bundle that is
 * already dominated by question content.
 *
 * The two layers must share every font and spacing property or the caret
 * drifts, so both use the same class list.
 */

const SHARED =
  'font-mono text-[15px] leading-[1.6] md:text-[13.5px] whitespace-pre-wrap break-words ' +
  'px-3 py-2.5 m-0 border-0';

export function SqlEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  minRows = 6,
  label = 'SQL query',
  errorLine,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Ctrl/Cmd+Enter runs the query. */
  onRun?: () => void;
  readOnly?: boolean;
  minRows?: number;
  label?: string;
  /** 1-based line to mark as the error location. */
  errorLine?: number;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);

  const lines = highlightLines(value || ' ', 'sql');
  const rows = Math.max(minRows, lines.length + 1);

  // Keep the painted layer aligned while the textarea scrolls.
  const syncScroll = useCallback(() => {
    if (!textarea.current || !backdrop.current) return;
    backdrop.current.scrollTop = textarea.current.scrollTop;
    backdrop.current.scrollLeft = textarea.current.scrollLeft;
  }, []);

  useEffect(syncScroll, [value, syncScroll]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
      return;
    }

    // Tab indents rather than leaving the field. Shift+Tab still moves focus,
    // so the editor never becomes a keyboard trap.
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart, selectionEnd } = el;
      const next = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + 2;
      });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-edge bg-surface">
      <div
        ref={backdrop}
        aria-hidden="true"
        className={'code-surface pointer-events-none absolute inset-0 overflow-hidden ' + SHARED}
      >
        {lines.map((tokens, i) => (
          <div
            key={i}
            className={
              errorLine === i + 1 ? 'bg-bad/15 -mx-3 px-3' : undefined
            }
          >
            {tokens.length === 0 ? (
              <span> </span>
            ) : (
              tokens.map((t, j) => (
                <span key={j} className={'tok-' + t.cls}>
                  {t.text}
                </span>
              ))
            )}
          </div>
        ))}
      </div>

      <textarea
        ref={textarea}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        aria-label={label}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        className={
          'scroll-thin relative block w-full resize-y bg-transparent text-transparent caret-accent ' +
          'outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ' +
          (readOnly ? 'cursor-default ' : '') +
          SHARED
        }
        style={{ caretColor: 'rgb(var(--c-accent))' }}
      />
    </div>
  );
}
