import type { DailyActivity, ExamTrendPoint } from '../lib/analytics';
import { formatDate } from '../lib/format';

/**
 * Hand-rolled SVG charts. The app needs exactly two shapes, both tiny, so a
 * charting library would be far more bytes than the thirty lines below. Each
 * scales with its container via viewBox rather than a pixel width.
 */

const W = 600;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 30 };

export function ExamTrendChart({ points }: { points: ExamTrendPoint[] }) {
  if (points.length === 0) return null;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const area =
    line +
    ` L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}` +
    ` L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest && first ? latest.pct - first.pct : 0;

  return (
    <div>
      <div className="h-56 w-full md:h-64">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`Exam score trend across ${points.length} exams, latest ${latest?.pct ?? 0} percent`}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.32" />
              <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="rgb(var(--c-hairline))"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 6}
                y={y(v) + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgb(var(--c-fg-faint))"
              >
                {v}
              </text>
            </g>
          ))}

          {/* Pass mark, so the trend reads against the thing that matters. */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(70)}
            y2={y(70)}
            stroke="rgb(var(--c-ok))"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />

          <path d={area} fill="url(#trend-fill)" />
          <path
            d={line}
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={p.at}
              cx={x(i)}
              cy={y(p.pct)}
              r="3.5"
              fill="rgb(var(--c-accent))"
              stroke="rgb(var(--c-surface))"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>
          {first ? formatDate(first.at) : ''}
          {points.length > 1 && latest ? ' – ' + formatDate(latest.at) : ''}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-ok" />
            pass mark
          </span>
          {points.length > 1 && (
            <span className={delta >= 0 ? 'text-ok' : 'text-bad'}>
              {delta >= 0 ? '+' : ''}
              {delta} pts since first exam
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function ActivityChart({ days }: { days: DailyActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.answered));

  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label="Questions answered per day">
        {days.map((d) => {
          const height = (d.answered / max) * 100;
          const accuracy = d.answered === 0 ? 0 : Math.round((d.correct / d.answered) * 100);
          return (
            <div key={d.date} className="group flex min-w-0 flex-1 flex-col justify-end">
              <div
                className={
                  'w-full rounded-t ' + (d.answered === 0 ? 'bg-hairline' : 'bg-accent')
                }
                style={{ height: d.answered === 0 ? '2px' : `max(4px, ${height}%)` }}
                title={`${d.date}: ${d.answered} answered${d.answered ? `, ${accuracy}% correct` : ''}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-fg-faint">
        <span>{days[0]?.date.slice(5)}</span>
        <span>today</span>
      </div>
    </div>
  );
}
