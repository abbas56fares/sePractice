import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Flag,
  Monitor,
  Moon,
  RotateCcw,
  Shield,
  Sun,
  Timer,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ThemePreference, UnlockMode } from '../types';
import { useApp } from '../state/AppContext';
import { QUESTIONS } from '../data/questions';
import { validateBank } from '../lib/validation';
import { downloadFile, toCsvExport, toJsonExport } from '../lib/storage';
import { formatDateTime } from '../lib/format';
import { Button, Card, Pill, SectionHeading } from '../components/ui';
import { Modal } from '../components/ui/Modal';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-fg-faint">{hint}</p>}
    </div>
  );
}

const INPUT_CLASS =
  'w-full min-h-11 rounded-lg border border-hairline bg-canvas px-3 text-sm text-fg placeholder-fg-faint';

export function Settings() {
  const { data, dispatch, notify, importJson } = useApp();
  const s = data.settings;
  const fileInput = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const issues = useMemo(() => validateBank(QUESTIONS), []);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const set = (patch: Partial<typeof s>) => dispatch({ type: 'settings:update', patch });

  const numberField = (
    key: 'finalExamQuestions' | 'finalExamMinutes' | 'topicExamQuestions' | 'topicExamMinutes' | 'passThresholdPct' | 'timerWarningMinutes',
    min: number,
    max: number
  ) => (
    <input
      type="number"
      min={min}
      max={max}
      value={s[key]}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n)) return;
        set({ [key]: Math.max(min, Math.min(max, Math.round(n))) } as Partial<typeof s>);
      }}
      className={INPUT_CLASS}
    />
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Settings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base">
          Everything is stored locally in this browser. No account, no server, nothing leaves your
          machine.
        </p>
      </div>

      {/* Appearance */}
      <section>
        <SectionHeading title="Appearance" icon={<Sun size={18} />} />
        <Card className="p-5">
          <Field
            label="Theme"
            hint="System follows your operating system's light/dark preference and updates live."
          >
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as { value: ThemePreference; label: string; icon: typeof Sun }[]
              ).map((o) => {
                const Icon = o.icon;
                return (
                  <Button
                    key={o.value}
                    variant={s.theme === o.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => set({ theme: o.value })}
                    aria-pressed={s.theme === o.value}
                  >
                    <Icon size={14} />
                    {o.label}
                  </Button>
                );
              })}
            </div>
          </Field>
        </Card>
      </section>

      {/* Exam configuration */}
      <section>
        <SectionHeading
          title="Exam configuration"
          icon={<Timer size={18} />}
          description="Defaults match a real junior screening test: 30 questions in 60 minutes."
        />
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Final exam questions" hint="Capped by the number available in the level.">
              {numberField('finalExamQuestions', 5, 60)}
            </Field>
            <Field label="Final exam minutes">{numberField('finalExamMinutes', 5, 180)}</Field>
            <Field label="Topic exam questions">{numberField('topicExamQuestions', 3, 30)}</Field>
            <Field label="Topic exam minutes">{numberField('topicExamMinutes', 3, 90)}</Field>
            <Field
              label="Timer warning (minutes left)"
              hint="When the countdown turns red and a warning appears."
            >
              {numberField('timerWarningMinutes', 1, 30)}
            </Field>
            <Field label="Question order">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={s.shuffleQuestions ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => set({ shuffleQuestions: true })}
                  aria-pressed={s.shuffleQuestions}
                >
                  Shuffle
                </Button>
                <Button
                  variant={!s.shuffleQuestions ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => set({ shuffleQuestions: false })}
                  aria-pressed={!s.shuffleQuestions}
                >
                  Fixed order
                </Button>
              </div>
            </Field>
          </div>

          <p className="mt-5 rounded-lg border border-hairline bg-raised px-3.5 py-2.5 text-xs text-fg-muted">
            Current final-exam pace: about{' '}
            <strong className="font-semibold text-fg-soft">
              {Math.round((s.finalExamMinutes * 60) / Math.max(1, s.finalExamQuestions))} seconds
            </strong>{' '}
            per question.
          </p>
        </Card>
      </section>

      {/* Progression */}
      <section>
        <SectionHeading
          title="Progression rules"
          icon={<Shield size={18} />}
          description="How strictly the roadmap gates topics and levels."
        />
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Pass mark"
              hint="Score needed to mark a topic or level complete and unlock what follows."
            >
              {numberField('passThresholdPct', 40, 100)}
            </Field>
            <Field label="Unlocking">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'gated', label: 'Gated' },
                    { value: 'open', label: 'Everything open' },
                  ] as { value: UnlockMode; label: string }[]
                ).map((o) => (
                  <Button
                    key={o.value}
                    variant={s.unlockMode === o.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => set({ unlockMode: o.value })}
                    aria-pressed={s.unlockMode === o.value}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </Field>
          </div>

          <ul className="mt-5 flex flex-col gap-2 text-sm text-fg-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
              <span>
                <strong className="font-medium text-fg-soft">Gated:</strong> a topic completes at{' '}
                {s.passThresholdPct}% on its topic exam. A {s.passThresholdPct}% average across the
                level's topic exams unlocks the level final; {s.passThresholdPct}% on that final
                unlocks the next level.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
              <span>
                <strong className="font-medium text-fg-soft">Everything open:</strong> nothing is
                locked. Progress is still tracked, exactly the same.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
              <span>
                Changing these never deletes a result. Retaking an exam always adds a new entry to
                your history.
              </span>
            </li>
          </ul>
        </Card>
      </section>

      {/* Practice */}
      <section>
        <SectionHeading title="Practice" icon={<Flag size={18} />} />
        <Card className="p-5">
          <Field
            label="Hints"
            hint="Hints never appear in exam mode, regardless of this setting."
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant={s.hintsEnabled ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => set({ hintsEnabled: true })}
                aria-pressed={s.hintsEnabled}
              >
                Available on demand
              </Button>
              <Button
                variant={!s.hintsEnabled ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => set({ hintsEnabled: false })}
                aria-pressed={!s.hintsEnabled}
              >
                Hidden
              </Button>
            </div>
          </Field>

          {data.flagged.length > 0 && (
            <div className="mt-5 border-t border-hairline pt-5">
              <Field label={`Flagged questions (${data.flagged.length})`}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'flag:clear' });
                    notify('All flags cleared.', 'success');
                  }}
                >
                  <Trash2 size={14} />
                  Clear all flags
                </Button>
              </Field>
            </div>
          )}
        </Card>
      </section>

      {/* Data */}
      <section>
        <SectionHeading
          title="Your data"
          icon={<Database size={18} />}
          description="Export to keep a backup, or to move your progress to another browser."
        />
        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="label">Exams</dt>
              <dd className="mt-1 text-lg font-bold text-fg">{data.examResults.length}</dd>
            </div>
            <div>
              <dt className="label">Questions touched</dt>
              <dd className="mt-1 text-lg font-bold text-fg">
                {Object.keys(data.questionStats).length}
              </dd>
            </div>
            <div>
              <dt className="label">Practice answers</dt>
              <dd className="mt-1 text-lg font-bold text-fg">{data.practiceLog.length}</dd>
            </div>
            <div>
              <dt className="label">Flagged</dt>
              <dd className="mt-1 text-lg font-bold text-fg">{data.flagged.length}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-fg-faint">
            Profile created {formatDateTime(data.createdAt)} &middot; last updated{' '}
            {formatDateTime(data.updatedAt)}
          </p>

          <div className="mt-5 flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                downloadFile(
                  `java-assessment-progress-${new Date().toISOString().slice(0, 10)}.json`,
                  toJsonExport(data),
                  'application/json'
                );
                notify('Progress exported as JSON.', 'success');
              }}
            >
              <FileJson size={15} />
              Export JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                downloadFile(
                  `java-assessment-exams-${new Date().toISOString().slice(0, 10)}.csv`,
                  toCsvExport(data),
                  'text/csv'
                );
                notify('Exam history exported as CSV.', 'success');
              }}
              disabled={data.examResults.length === 0}
            >
              <Download size={15} />
              Export exam CSV
            </Button>
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <Upload size={15} />
              Import JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => importJson(String(reader.result ?? ''));
                reader.onerror = () => notify('Could not read that file.', 'error');
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
            <Button variant="danger" onClick={() => setResetOpen(true)} className="sm:ml-auto">
              <RotateCcw size={15} />
              Reset all progress
            </Button>
          </div>
        </Card>
      </section>

      {/* Bank health */}
      <section>
        <SectionHeading
          title="Question bank health"
          icon={errors.length === 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          description="The same structural audit that runs in `npm run verify`, checked live against the bundled bank."
        />
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{QUESTIONS.length} questions</Pill>
            <Pill>{QUESTIONS.filter((q) => q.verify).length} JDK-verifiable</Pill>
            <Pill
              className={
                errors.length === 0 ? 'border-ok/40 text-ok' : 'border-bad/40 text-bad'
              }
            >
              {errors.length === 0 ? (
                <>
                  <CheckCircle2 size={11} /> no structural errors
                </>
              ) : (
                <>
                  <AlertTriangle size={11} /> {errors.length} errors
                </>
              )}
            </Pill>
            {warnings.length > 0 && (
              <Pill className="border-warn/40 text-warn">{warnings.length} warnings</Pill>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Every question is checked for a unique id, four distinct options, exactly one keyed
            answer, and a written rebuttal for each distractor. Separately,{' '}
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs">npm run verify</code>{' '}
            compiles and runs each Java snippet against a real JDK and compares the real output with
            the answer key.
          </p>

          {issues.length > 0 && (
            <ul className="mt-4 flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-lg border border-hairline bg-raised p-3 font-mono text-xs">
              {issues.slice(0, 50).map((i, n) => (
                <li
                  key={i.questionId + n}
                  className={i.severity === 'error' ? 'text-bad' : 'text-warn'}
                >
                  {i.questionId}: {i.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all progress?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'data:reset' });
                setResetOpen(false);
                notify('All progress reset.', 'success');
              }}
            >
              <Trash2 size={15} />
              Delete everything
            </Button>
          </>
        }
      >
        <p>
          This permanently deletes your exam history, practice records, flags and settings from this
          browser. It cannot be undone.
        </p>
        <p className="mt-3 text-fg-muted">
          Export your progress as JSON first if you might want it back.
        </p>
      </Modal>
    </div>
  );
}
