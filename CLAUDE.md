# Assessment Platform — Programming & SQL

## Purpose
A personal, offline-first web app for preparing for junior Software Engineer internship and
entry-level technical screens. **Two majors**, each with three levels of seven topics:

- **Programming** — Java, OOP, data structures, algorithms. 282 questions.
- **SQL & Databases** — queries, joins, schema design. 232 questions, 74 of them query-writing
  exercises graded by actually running the query.

Untimed practice with full explanations, separate timed exam modes, plus results, analytics and
progress tracking. Single user, no account, no backend.

## Architecture
React 19 + TypeScript (strict) + Vite 8 + Tailwind CSS 3, `react-router-dom`, `lucide-react`.
Charts, the syntax highlighter **and the SQL engine** are hand-rolled, not dependencies. All state
lives in `localStorage` behind a `ProgressRepository` interface, so a backend can be swapped in
later without touching the UI.

The two majors share the design system, UI primitives, storage layer and exam *patterns*, but keep
separate data: `AppData.sql` is its own block, so neither major's accounting can affect the other.

**Programming major**
- `src/types/index.ts` — shared domain model plus `AppData`.
- `src/data/levels.ts`, `src/data/questions/` — 21 topic files + `seed.ts` + `index.ts`.
- `src/lib/` — `exam.ts`, `progress.ts`, `analytics.ts`, `storage.ts`, `validation.ts`,
  `format.ts`.
- `src/pages/` — Dashboard, Roadmap, Practice, Exam, ExamResults, Analytics, Settings, NotFound.

**SQL major**
- `src/types/sql.ts` — SQL domain model (questions, topics, lessons, exams, progress).
- `src/lib/sql/` — the engine: `tokens` → `parser` → `execute`, plus `values` (three-valued
  logic), `functions`, `database`, `compare` (result-set grading) and `index.ts` (public API and
  the safety policy).
- `src/lib/sql-grading.ts`, `sql-exam.ts`, `sql-progress.ts`, `sql-validation.ts`.
- `src/data/sql/` — `datasets.ts`, `levels.ts`, `lessons.ts`, `exams.ts`, `engine-tests.ts`,
  `questions/` (21 topic files).
- `src/components/sql/` — `SqlEditor`, `SqlResultTable`, `SqlQuestionView`, `JoinDiagram`.
- `src/pages/sql/` — Dashboard, Level, Topic, Practice, Labs, Workbench, Tests, Exam, Results,
  Progress.

**Shared** — `src/lib/highlight.ts` (tokenizer used by both `CodeBlock` and the SQL editor),
`src/state/AppContext.tsx` (one reducer, with a `sql:` action namespace).

Full file tree and both question-authoring procedures are in `README.md`.

## Conventions
- **Design tokens only.** Colours are CSS variables in `src/index.css` (`--c-*` surfaces/text/accent,
  `--s-*` syntax), mapped into Tailwind in `tailwind.config.js`. Components reference semantic names
  (`bg-surface`, `text-fg-muted`, `border-hairline`) and never raw Tailwind palette colours. Light
  and dark are a `.dark` class swap.
- **Java snippets are complete compilable programs** (`class Main { public static void main… }`),
  authored as template literals in the `c` field of a seed object. There are no `.java` files in the
  repo — the verifier writes a throwaway `Main.java` into an OS temp dir at run time.
- **Never reorder a question's options.** Exam *question* order is shuffled; options are not —
  reordering is the easiest way to silently break an answer key.
- **Every question-bank change ends with `npm run verify`.** For Java, adding a question without a
  `verify` spec is allowed only for concept/complexity items with nothing to execute. For SQL,
  prefer a `v: { sql, expect }` spec or an executable exercise — anything the verifier can run is
  one less thing that can quietly rot.
- **SQL is taught as PostgreSQL.** The engine implements a PostgreSQL subset, so the dialect
  taught, executed and verified is the same one. Where another engine differs meaningfully, say so
  in the question's `dn` field or the lesson's `dialectNotes` rather than presenting
  non-portable syntax as universal.
- **A SQL exercise's expected result is whatever its reference solution returns.** Never hand-write
  expected rows for an executable question; the verifier derives them.
- New e2e assertions go through the `page.text()` / `page.has()` helpers, which lowercase body text
  (`innerText` returns uppercased text for `.label` elements).
- Use literal characters (`·`) in JS strings, not HTML entities — entities only decode in JSX text
  nodes.

## Commands
```
npm install
npm run dev            # Vite dev server, http://localhost:5173
npm run build          # tsc -b && vite build
npm run lint           # oxlint
npm run verify         # both banks (Java JDK pass + SQL engine/bank/solutions)
npm run verify:java    # Java bank only
npm run verify:sql     # SQL engine conformance + bank audit + reference solutions
npm run verify:engine  # just the 102 SQL engine cases (fast inner loop)
npm run test:e2e       # headless-Chrome end-to-end suite, both majors
npm run test:e2e:sql   # SQL half only
npm run check          # lint + build + verify
```
JDK 21 for `verify:java` lives at `/opt/homebrew/opt/openjdk@21/bin`. The SQL passes need no
external engine — the verifier bundles the app's own engine and runs it in Node.

## Testing
Three harnesses, all plain Node scripts with no browser-automation dependency:

- `scripts/verify-bank.mjs` — audits the Java bank's structure, then compiles and runs each snippet
  against a real JDK and diffs the output against the keyed option. Silently skips the JDK pass
  (saying so) if no JDK is found. `--structural` runs the audit only.
- `scripts/verify-sql.mjs` — three passes: the 102 engine conformance cases, the SQL bank's
  structural audit, and execution of every reference solution (plus every `v` spec and every
  declared near-miss). `--engine` and `--bank` run one pass.
- `scripts/e2e.mjs` — drives the installed Google Chrome over the DevTools Protocol using Node's
  built-in `WebSocket`, against a throwaway profile dir. **Each major runs in its own browser
  session** (`--only java` / `--only sql`): a single long-lived headless session eventually stops
  laying the page out, after which `innerText` and `scrollWidth` hang. The macOS Chrome path is
  hardcoded in the `CHROME` constant; change it to run elsewhere.

## Deployment
None. Static SPA, run locally with `npm run dev`; `npm run build` emits a deployable `dist/` if that
is ever wanted.

## Constraints
- **Offline-first, single-user, no backend.** No accounts, no network calls, no analytics services.
- **Never reset or migrate saved progress** without an explicit instruction. Progress is the user's
  real study history and lives only in `localStorage` — schema changes need a migration in
  `storage.ts`, not a wipe.

## Decisions

- **Final exams unlock on the level average**, not 70% per topic (`levelTopicAveragePct()` in
  `src/lib/progress.ts`, mirrored by `sqlLevelTopicAveragePct()`). Topics never sat count as 0 in
  the mean, deliberately. The SQL major follows the same rule.
- **The SQL engine is hand-rolled rather than WASM SQLite.** A WASM build would dwarf the bundle,
  need fetching at run time, and teach SQLite's dialect instead of the PostgreSQL one the lessons
  describe. Writing it keeps the dialect taught, executed and verified identical, and keeps the
  app genuinely offline.
- **Written queries are graded by comparing results, never query text** (`src/lib/sql/compare.ts`).
  Strict about row multiplicity, NULLs and ordering-when-asked-for; lenient about column labels
  unless the question names them, and row order when it does not.
- **A SQL exam re-runs executable answers at submission time** (`scoreSqlExam`), so the recorded
  outcome does not depend on whether the learner pressed Run.
- **`AppData.sql` is a separate block, added in schema 2.** `migrate()` fills it in empty for an
  older payload and never resets anything already stored.
- **Tailwind 3, not 4** — the global `/pro-design` skill is written against v3 conventions. Revisit
  only if that skill is updated.
- **Exam clock derives from a persisted absolute `deadline`**, never an accumulated counter, which is
  what makes refresh/navigation/tab-close safety and expired-exam auto-submit fall out for free.
- **Exam answers also write into `questionStats`**, so Mistake Review and weak-topic analysis cover
  exam performance too.
- **Duplicate-option detection is case-sensitive** — in a Java bank `"hello"` and `"HELLO"` are
  genuinely different options.
- `esbuild` is a devDependency purely so `verify-bank.mjs` can bundle the TS bank for Node (Vite 8
  ships rolldown).

## Known issues
- Bundle is ~1.08 MB / 308 KB gzipped, over Vite's 500 KB warning. That is question content for
  both majors, needed on nearly every route; code-splitting was judged not worth the complexity.
- Four intentional lint warnings: three `only-export-components` on `AppContext.tsx` (hooks
  exported beside the provider), and `set-state-in-effect` on the drawer's close-on-navigation
  effect in `AppShell.tsx` (guarded).
- **The SQL engine implements a subset.** Anything outside it is reported as a clear error rather
  than guessed at. No `EXPLAIN`, no real transaction isolation, no indexes, no stored procedures or
  triggers — those are taught as concepts and assessed with multiple-choice questions, stated on
  the questions themselves rather than faked with a decorative Run button. `NATURAL JOIN` is
  deliberately rejected with a message telling you to write the condition out.
- Result-based grading cannot see intent: a non-sargable query returning the right rows still
  passes. `SQL-L3-PRF-W01` says so on the question.
- The directory is **not a git repository** — nothing is committed. `.gitignore` is written.
