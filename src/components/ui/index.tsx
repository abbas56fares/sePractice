import { Link } from 'react-router-dom';
import type { ComponentProps, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { Difficulty, TopicStatus } from '../../types';

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

/**
 * Interaction feedback is a colour change only — no transition, scale or
 * shadow movement anywhere in this file. Focus rings come from the global
 * :focus-visible rule.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-strong active:bg-accent-press border border-transparent',
  secondary:
    'bg-raised text-fg hover:bg-hairline active:bg-edge border border-edge',
  ghost: 'bg-transparent text-fg-muted hover:bg-raised hover:text-fg border border-transparent',
  danger: 'bg-bad/10 text-bad hover:bg-bad/20 border border-bad/30',
};

const SIZES: Record<ButtonSize, string> = {
  // min-h-11 is 44px: the minimum comfortable touch target.
  sm: 'min-h-9 px-3 text-[13px] gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
};

function buttonClass(variant: ButtonVariant, size: ButtonSize, extra?: string) {
  return [
    'inline-flex items-center justify-center rounded-lg font-medium',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    extra ?? '',
  ].join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* -------------------------------------------------------------------- cards */

export function Card({
  className = '',
  children,
  ...rest
}: ComponentProps<'div'> & { children: ReactNode }) {
  return (
    <div className={'card ' + className} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeading({
  icon,
  title,
  action,
  description,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg md:text-xl">
          {icon && <span className="text-accent-text">{icon}</span>}
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------- progress */

export function ProgressBar({
  value,
  tone = 'accent',
  label,
  className = '',
}: {
  value: number;
  tone?: 'accent' | 'ok' | 'warn' | 'bad';
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = {
    accent: 'bg-accent',
    ok: 'bg-ok',
    warn: 'bg-warn',
    bad: 'bg-bad',
  }[tone];

  return (
    <div
      className={'h-1.5 w-full overflow-hidden rounded-full bg-hairline ' + className}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <div className={'h-full rounded-full ' + fill} style={{ width: clamped + '%' }} />
    </div>
  );
}

/** Circular progress for the level cards. Scales with its container. */
export function ProgressRing({
  value,
  size = 64,
  children,
}: {
  value: number;
  size?: number;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 28;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-hairline" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-fg">
        {children ?? Math.round(clamped) + '%'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- badges */

const STATUS_STYLE: Record<TopicStatus, { label: string; cls: string }> = {
  locked: { label: 'Locked', cls: 'bg-raised text-fg-faint border-edge' },
  available: { label: 'Available', cls: 'bg-info/10 text-info border-info/30' },
  'in-progress': { label: 'In progress', cls: 'bg-warn/10 text-warn border-warn/30' },
  completed: { label: 'Completed', cls: 'bg-ok/10 text-ok border-ok/30' },
};

export function StatusBadge({ status }: { status: TopicStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ' +
        s.cls
      }
    >
      <span
        className={
          'h-1.5 w-1.5 rounded-full ' +
          (status === 'completed'
            ? 'bg-ok'
            : status === 'in-progress'
              ? 'bg-warn'
              : status === 'available'
                ? 'bg-info'
                : 'bg-fg-faint')
        }
      />
      {s.label}
    </span>
  );
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'bg-ok/10 text-ok border-ok/30',
  medium: 'bg-warn/10 text-warn border-warn/30',
  hard: 'bg-bad/10 text-bad border-bad/30',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ' +
        DIFFICULTY_STYLE[difficulty]
      }
    >
      {difficulty}
    </span>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-raised px-2.5 py-1 text-xs text-fg-muted ' +
        className
      }
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- stat cards */

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'accent' | 'ok' | 'warn' | 'bad' | 'info';
}) {
  const chip = {
    accent: 'bg-accent/10 text-accent-text border-accent/30',
    ok: 'bg-ok/10 text-ok border-ok/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
    bad: 'bg-bad/10 text-bad border-bad/30',
    info: 'bg-info/10 text-info border-info/30',
  }[tone];

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        {icon && (
          <span
            className={
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ' + chip
            }
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-fg md:text-3xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-fg-muted">{sub}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------- empty states */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-raised text-fg-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-fg-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------- toasts */

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; message: string; tone: 'info' | 'success' | 'error' }[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  const icons = {
    info: <Info size={16} />,
    success: <CheckCircle2 size={16} />,
    error: <AlertTriangle size={16} />,
  };
  const tones = {
    info: 'border-info/40 text-info',
    success: 'border-ok/40 text-ok',
    error: 'border-bad/40 text-bad',
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-overlay px-3.5 py-3 text-sm text-fg shadow-lg ' +
            tones[t.tone]
          }
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
          <span className="min-w-0 flex-1 text-fg-soft">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="-m-1 shrink-0 rounded p-1 text-fg-faint hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
