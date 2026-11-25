import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Coffee,
  Database,
  GitMerge,
  LayoutDashboard,
  Layers,
  Menu,
  Monitor,
  Moon,
  RotateCcw,
  Settings as SettingsIcon,
  Sun,
  Terminal,
  Timer,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemePreference } from '../../types';
import { useApp } from '../../state/AppContext';
import { LEVELS } from '../../data/levels';
import { SQL_LEVELS } from '../../data/sql/levels';
import { remainingMs } from '../../lib/exam';
import { sqlRemainingMs } from '../../lib/sql-exam';
import { formatClock } from '../../lib/format';
import { ToastStack } from '../ui';

/**
 * Two majors, each with its own section. Programming keeps every route it
 * had; SQL is a sibling rather than a sub-page of it, which is what makes
 * them read as co-equal subjects.
 */
const PROGRAMMING_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/roadmap', label: 'Assessment Roadmap', icon: BookOpen, end: false },
  { to: '/practice', label: 'Practice', icon: Coffee, end: false },
  { to: '/exam', label: 'Timed Exam', icon: Timer, end: false },
  { to: '/review', label: 'Mistake Review', icon: RotateCcw, end: false },
  { to: '/analytics', label: 'Progress Analytics', icon: BarChart3, end: false },
];

const SQL_NAV = [
  { to: '/sql', label: 'SQL Dashboard', icon: Database, end: true },
  { to: '/sql/joins', label: 'JOIN Lab', icon: GitMerge, end: false },
  { to: '/sql/combinations', label: 'Clause Combinations', icon: Layers, end: false },
  { to: '/sql/workbench', label: 'SQL Workbench', icon: Terminal, end: false },
  { to: '/sql/tests', label: 'Mock Tests & Finals', icon: ClipboardList, end: false },
  { to: '/sql/review', label: 'SQL Mistake Review', icon: RotateCcw, end: false },
  { to: '/sql/progress', label: 'SQL Progress', icon: BarChart3, end: false },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-mono text-[11px] font-bold leading-none text-white">
        SE
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-fg">
          Assessment Platform
        </span>
        <span className="block truncate text-[11px] leading-tight text-fg-faint">
          Programming &middot; SQL interview prep
        </span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { data, dispatch } = useApp();
  const options: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-hairline bg-raised p-0.5"
      role="group"
      aria-label="Theme"
    >
      {options.map((o) => {
        const active = data.settings.theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => dispatch({ type: 'settings:update', patch: { theme: o.value } })}
            aria-label={o.label + ' theme'}
            aria-pressed={active}
            title={o.label}
            className={
              'flex h-8 w-8 items-center justify-center rounded-md ' +
              (active ? 'bg-surface text-accent-text' : 'text-fg-faint hover:text-fg')
            }
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Live banners so an in-flight exam is never lost behind another page.
 * Each major has its own, and both can be live at once.
 */
function ExamBanner() {
  const { data } = useApp();
  const exam = data.activeExam;
  const sqlExam = data.sql.activeExam;
  const [, tick] = useState(0);

  useEffect(() => {
    if (!exam && !sqlExam) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [exam, sqlExam]);

  if (!exam && !sqlExam) return null;

  return (
    <div className="mx-3 mb-3 flex flex-col gap-2">
      {exam && (
        <BannerLink
          to="/exam"
          left={remainingMs(exam)}
          title={exam.kind === 'final' ? `Level ${exam.level} final` : 'Topic exam'}
          answered={Object.keys(exam.answers).length}
          total={exam.questionIds.length}
        />
      )}
      {sqlExam && (
        <BannerLink
          to="/sql/exam"
          left={sqlRemainingMs(sqlExam)}
          title="SQL exam"
          answered={
            sqlExam.questionIds.filter(
              (id) => sqlExam.answers[id] !== undefined || Boolean(sqlExam.queries[id]?.trim())
            ).length
          }
          total={sqlExam.questionIds.length}
        />
      )}
    </div>
  );
}

function BannerLink({
  to,
  left,
  title,
  answered,
  total,
}: {
  to: string;
  left: number;
  title: string;
  answered: number;
  total: number;
}) {
  const expired = left <= 0;
  return (
    <Link
      to={to}
      className={
        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ' +
        (expired
          ? 'border-bad/40 bg-bad/10 hover:border-bad/60'
          : 'border-warn/40 bg-warn/10 hover:border-warn/60')
      }
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          {expired ? 'Time is up' : 'Exam in progress'}
        </span>
        <span className="block truncate text-xs text-fg-muted">
          {title} &middot; {answered}/{total} answered
        </span>
      </span>
      <span
        className={'shrink-0 font-mono text-sm font-semibold ' + (expired ? 'text-bad' : 'text-warn')}
      >
        {formatClock(left)}
      </span>
    </Link>
  );
}

const LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ' +
  (isActive
    ? 'bg-accent/10 font-medium text-accent-text'
    : 'text-fg-muted hover:bg-raised hover:text-fg');

function MajorHeading({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="mb-1 mt-6 px-3 first:mt-0">
      <span className="label">{label}</span>
      <span className="mt-0.5 block text-[11px] leading-tight text-fg-faint">{hint}</span>
    </div>
  );
}

function LevelLinks({
  prefix,
  levels,
  onNavigate,
}: {
  prefix: string;
  levels: { id: number; name: string }[];
  onNavigate?: () => void;
}) {
  return (
    <>
      {levels.map((level) => (
        <NavLink
          key={prefix + level.id}
          to={prefix + level.id}
          onClick={onNavigate}
          className={LINK_CLASS}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-hairline bg-raised font-mono text-[11px] text-fg-muted">
            {level.id}
          </span>
          <span className="truncate">{level.name}</span>
        </NavLink>
      ))}
    </>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
      <MajorHeading label="Programming" hint="Java, OOP, data structures" />
      {PROGRAMMING_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={LINK_CLASS}
          >
            <Icon size={17} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
      <LevelLinks prefix="/level/" levels={LEVELS} onNavigate={onNavigate} />

      <MajorHeading label="SQL & Databases" hint="Queries, joins, schema design" />
      {SQL_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={LINK_CLASS}
          >
            <Icon size={17} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
      <LevelLinks
        prefix="/sql/level/"
        levels={SQL_LEVELS.map((l) => ({ id: l.id, name: l.name }))}
        onNavigate={onNavigate}
      />

      <div className="mt-6 border-t border-hairline pt-2">
        <NavLink to="/settings" onClick={onNavigate} className={LINK_CLASS}>
          <SettingsIcon size={17} className="shrink-0" />
          <span className="truncate">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { toasts, dismissToast } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on navigation and when the viewport reaches desktop, so
  // neither route changes nor resizing can leave it stuck open.
  // Only writes when it is actually open, so an ordinary navigation with the
  // drawer already closed does not trigger a second render.
  useEffect(() => setDrawerOpen((open) => (open ? false : open)), [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', drawerOpen);
    return () => document.body.classList.remove('overflow-hidden');
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar: fixed, outside the scroll flow. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hairline bg-surface lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <ExamBanner />
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pb-4">
          <NavList />
        </div>
        <div className="border-t border-hairline px-5 py-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile header: logo at one end, drawer trigger at the other. */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="nav-drawer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-edge bg-raised text-fg hover:bg-hairline"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer slides from the trigger's edge. */}
      <aside
        id="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawerOpen}
        className={
          'fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-hairline bg-surface transition-transform duration-300 lg:hidden ' +
          (drawerOpen ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <span className="text-sm font-semibold text-fg">Menu</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto py-3">
          <ExamBanner />
          <NavList onNavigate={() => setDrawerOpen(false)} />
        </div>
        {/* Secondary controls live here below lg, instead of crowding the logo. */}
        <div className="border-t border-hairline px-4 py-4">
          <ThemeToggle />
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">{children}</div>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
