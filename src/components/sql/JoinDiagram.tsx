/**
 * Which rows each join type keeps, drawn rather than described.
 *
 * Hand-rolled inline SVG, in line with the rest of the project's charts: it
 * is a few dozen lines, needs no dependency, and inherits the theme through
 * the same CSS variables everything else uses. Static — nothing animates and
 * nothing waits for the viewport.
 */

import { JOIN_SHAPES, type JoinKind } from '../../lib/join-shapes';

export type { JoinKind };

/** Two overlapping circles with the kept regions filled. */
export function JoinVennDiagram({
  kind,
  size = 120,
}: {
  kind: JoinKind;
  size?: number;
}) {
  if (kind === 'cross') return <CrossJoinDiagram size={size} />;

  const shape = JOIN_SHAPES.find((s) => s.kind === kind);
  if (!shape) return null;
  const { leftOnly, overlap, rightOnly } = shape.fill;

  const clipLeft = `clip-${kind}-left`;
  const clipRight = `clip-${kind}-right`;

  return (
    <svg
      viewBox="0 0 140 90"
      width={size}
      height={(size * 90) / 140}
      role="img"
      aria-label={`${shape.name}: ${shape.summary}`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipLeft}>
          <circle cx="55" cy="45" r="32" />
        </clipPath>
        <clipPath id={clipRight}>
          <circle cx="85" cy="45" r="32" />
        </clipPath>
      </defs>

      {/* Left-only region: the left circle, clipped away from the right one. */}
      {leftOnly && (
        <g clipPath={`url(#${clipLeft})`}>
          <rect x="0" y="0" width="140" height="90" className="fill-accent/35" />
          <circle cx="85" cy="45" r="32" className="fill-surface" />
        </g>
      )}

      {rightOnly && (
        <g clipPath={`url(#${clipRight})`}>
          <rect x="0" y="0" width="140" height="90" className="fill-accent/35" />
          <circle cx="55" cy="45" r="32" className="fill-surface" />
        </g>
      )}

      {overlap && (
        <g clipPath={`url(#${clipLeft})`}>
          <circle cx="85" cy="45" r="32" className="fill-accent/70" />
        </g>
      )}

      <circle cx="55" cy="45" r="32" fill="none" className="stroke-edge" strokeWidth="1.5" />
      <circle cx="85" cy="45" r="32" fill="none" className="stroke-edge" strokeWidth="1.5" />

      <text x="30" y="16" className="fill-current text-[10px] font-semibold" textAnchor="middle">
        A
      </text>
      <text x="110" y="16" className="fill-current text-[10px] font-semibold" textAnchor="middle">
        B
      </text>
    </svg>
  );
}

function CrossJoinDiagram({ size = 120 }: { size?: number }) {
  const cells = [0, 1, 2];
  return (
    <svg
      viewBox="0 0 140 90"
      width={size}
      height={(size * 90) / 140}
      role="img"
      aria-label="CROSS JOIN: every row of A paired with every row of B"
      className="shrink-0"
    >
      {cells.map((r) =>
        cells.map((c) => (
          <rect
            key={`${r}-${c}`}
            x={38 + c * 24}
            y={16 + r * 20}
            width="20"
            height="16"
            rx="3"
            className="fill-accent/40 stroke-edge"
            strokeWidth="1"
          />
        ))
      )}
      <text x="22" y="30" className="fill-current text-[10px] font-semibold" textAnchor="middle">
        A
      </text>
      <text x="74" y="12" className="fill-current text-[10px] font-semibold" textAnchor="middle">
        B
      </text>
    </svg>
  );
}

/** A row-level picture: which source rows survive, and where NULLs appear. */
export function JoinRowDiagram({ kind }: { kind: JoinKind }) {
  const left = [
    { label: 'Ali', matched: true },
    { label: 'Sara', matched: true },
    { label: 'Omar', matched: false },
    { label: 'Maya', matched: false },
  ];
  const right = [
    { label: 'IT', matched: true },
    { label: 'HR', matched: true },
    { label: 'Finance', matched: false },
  ];

  const keepLeftUnmatched = kind === 'left' || kind === 'full';
  const keepRightUnmatched = kind === 'right' || kind === 'full';

  const rows: { left: string | null; right: string | null }[] = [];
  left.forEach((l, i) => {
    if (l.matched) rows.push({ left: l.label, right: right[i]?.label ?? null });
    else if (keepLeftUnmatched) rows.push({ left: l.label, right: null });
  });
  if (keepRightUnmatched) {
    right.filter((r) => !r.matched).forEach((r) => rows.push({ left: null, right: r.label }));
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[260px] border-collapse text-left text-[13px]">
        <thead>
          <tr>
            <th className="border-b border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              e.name
            </th>
            <th className="border-b border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              d.name
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-3 py-4 text-center text-sm text-fg-faint">
                No rows
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="px-3 py-1.5 text-fg-soft">
                  {row.left ?? <span className="font-mono text-[11px] italic text-bad">NULL</span>}
                </td>
                <td className="px-3 py-1.5 text-fg-soft">
                  {row.right ?? <span className="font-mono text-[11px] italic text-bad">NULL</span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
