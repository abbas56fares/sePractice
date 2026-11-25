import { useMemo } from 'react';
import type { CodeLang } from '../types';
import { highlightLines } from '../lib/highlight';

export function CodeBlock({
  code,
  lang = 'java',
  showLineNumbers = true,
}: {
  code: string;
  lang?: CodeLang;
  showLineNumbers?: boolean;
}) {
  // Split into lines so each row can carry its own gutter number while the
  // token colours stay intact across newlines.
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);

  const label = lang === 'java' ? 'Java' : lang === 'sql' ? 'SQL' : 'React';

  return (
    <figure className="my-4 overflow-hidden rounded-lg border border-hairline">
      <figcaption className="flex items-center justify-between border-b border-hairline bg-raised px-3 py-1.5">
        <span className="label">{label}</span>
      </figcaption>
      {/* Wide snippets scroll inside this box; the page never scrolls sideways. */}
      <div className="code-surface scroll-thin overflow-x-auto">
        <pre className="min-w-full py-3 text-[12.5px] leading-[1.65] md:text-[13.5px]">
          <code className="block font-mono">
            {lines.map((tokens, i) => (
              <span key={i} className="flex">
                {showLineNumbers && (
                  <span
                    aria-hidden="true"
                    className="sticky left-0 w-9 shrink-0 select-none pr-3 text-right text-[11px] tok-comment"
                    style={{ background: 'var(--s-bg)' }}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="whitespace-pre pr-4">
                  {tokens.length === 0 ? (
                    ' '
                  ) : (
                    tokens.map((t, j) => (
                      <span key={j} className={'tok-' + t.cls}>
                        {t.text}
                      </span>
                    ))
                  )}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
