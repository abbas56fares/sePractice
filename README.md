# Assessment Platform — Programming & SQL

A personal, offline-first practice platform for junior Software Engineer internship and
entry-level technical screens. Two majors, each with three levels, untimed practice with full
explanations, and timed exams that behave like the real thing.

| Major | Content | How answers are checked |
|---|---|---|
| **Programming** | 282 questions across 21 Java/OOP/DSA topics | 253 answer keys confirmed by compiling and running the snippet against a real JDK |
| **SQL & Databases** | 232 questions across 21 topics, 74 of them query-writing exercises | every exercise graded by *executing* the query against the dataset and comparing results |

No account, no server, no network calls. Everything — including the SQL engine — lives in your
browser.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # type-check + production bundle into dist/
npm run preview      # serve the production build
```

### Verification and tests

```bash
npm run verify           # both banks: structural audit, JDK run, SQL engine + reference solutions
npm run verify:java      # Java bank only
npm run verify:sql       # SQL engine conformance, SQL bank, every reference solution
npm run verify:engine    # just the 102 SQL engine conformance cases (fast)
npm run test:e2e         # drive the app in headless Chrome (needs `npm run dev` running)
npm run test:e2e:sql     # only the SQL half of the suite
npm run lint
npm run check            # lint + build + verify
```

`npm run verify` needs a JDK for its second pass. Without one it still runs the structural audit
and tells you the JDK pass was skipped.

```bash
brew install openjdk@21      # macOS; any JDK 11+ on $PATH or $JAVA_HOME works
```

`npm run test:e2e` drives your installed Google Chrome over the DevTools Protocol using Node's
built-in WebSocket client — no Puppeteer, no Playwright, no extra dependencies. It launches Chrome
against a throwaway profile and never touches your own Chrome data. Screenshots land in
`test-screenshots/`.

Each major runs in its own browser session (`--only java`, `--only sql`). That is not cosmetic: a
single long-lived headless session eventually stops laying the page out, after which any read that
needs layout — `innerText`, `scrollWidth` — hangs. Two shorter sessions stay well inside that
limit, and they also prove neither major depends on the other's in-memory state.

---

## What it does

### Three levels, one layout

Every level has seven topic modules plus a final exam, and all three render through the same
components — only the content and difficulty differ.

| Level | Focus | Questions |
|---|---|---|
| 1 — Beginner | Variables and operators, control flow, arrays and strings, methods, classes, constructors, basic algorithms | 98 |
| 2 — Intermediate | Inheritance and `super`, overriding vs overloading, interfaces and abstract classes, polymorphism, initialization order, access modifiers, exceptions and collections | 92 |
| 3 — Advanced | Complex tracing, generics, equality and hashing, recursion, data structures and complexity, debugging, mixed screening (Java + SQL + React) | 92 |

### Practice mode

Untimed, one question at a time. Submit an answer and you immediately get the verdict, why the
keyed answer is right, **why each of the other three options is wrong**, and the hint if you did not
already use it. Flag anything difficult. Filter a topic down to just your mistakes, just your flags,
or just what you have never attempted.

Keyboard: `1`–`4` to pick, `Enter` to submit or advance.

### Exam mode

Deliberately a different engine. Defaults to 30 questions in 60 minutes (configurable), with:

- A live countdown that is **derived from a persisted absolute deadline**, so refreshing the page,
  navigating away, or closing the tab cannot reset or pause the clock.
- Answers, flags and your current position saved on every change.
- A question navigator showing answered / unanswered / flagged / current.
- Mark for review, Previous/Next, and a confirmation screen that counts what you are about to leave
  blank.
- Automatic submission at zero — including an exam whose deadline passed while the tab was closed.
- A warning when time is nearly up.
- **No feedback of any kind until you submit.**

Keyboard: `1`–`4` to answer, `←`/`→` to navigate, `F` to flag.

### Results and analytics

Score out of the total, percentage, correct/incorrect/unanswered counts, time used and average per
question, topic-by-topic performance weakest-first, and the full question-by-question review with
explanations. Exam history is append-only — retaking never overwrites an earlier result.

The analytics page adds an exam-score trend against the pass mark, a two-week practice-activity
chart, a per-topic accuracy table, and recommendations derived from your actual results.

### Progression

Configurable in Settings:

- **Gated** (default) — a topic completes at 70% on its topic exam. All seven content topics
  complete unlocks the level final; 70% on that final unlocks the next level.
- **Everything open** — nothing is locked, progress still tracked identically.

Changing the rules never deletes a result.

### Persistence and export

Everything is in `localStorage` under one key: exam history, practice history, in-flight exam
answers, level and topic progress, flags, mistakes, settings and theme. Export your progress as
JSON (re-importable) or your exam history as CSV from Settings.

---

## Question bank quality

Answer keys in a practice platform are worthless if they are wrong, so they are machine-checked
rather than eyeballed. `npm run verify` runs two independent passes:

**1. Structural audit** (`src/lib/validation.ts`, also shown live on the Settings page)

Unique ids, exactly four options with distinct text, exactly one keyed answer that is one of those
options, a written rebuttal for every distractor, no rationale accidentally attached to the correct
option, a real topic reference, and no duplicated prompt + snippet.

**2. JDK execution** (`scripts/verify-bank.mjs`)

Every question carrying a `verify` spec has its snippet written to `Main.java`, compiled with
`javac` and run:

| Mode | Assertion |
|---|---|
| `stdout` | the program's real output must equal `expect`, defaulting to the text of the keyed correct option |
| `compile-error` | `javac` must reject it |
| `runtime-throws` | it must compile, then throw the named exception |

**253 of the 282 questions are verified this way.** The remaining 29 are concept, complexity, SQL
and React questions with nothing to execute.

Current bank composition:

| | |
|---|---|
| Total | 282 questions |
| Machine-verified against a JDK | 253 |
| With a hint | 250 |
| Difficulty | 43 easy, 140 medium, 99 hard |
| Kinds | 195 output, 37 compile, 21 bug, 12 concept, 8 complexity, 5 SQL, 4 React |

---

## Adding new questions

One file per roadmap topic in `src/data/questions/`. To add a question, append a `Seed` to the
`seeds` array in the relevant file.

```ts
{
  id: '016',                         // unique within the file; the prefix is added automatically
  d: 'medium',                       // 'easy' | 'medium' | 'hard'
  k: 'output',                       // output | concept | compile | bug | complexity | sql | react
  p: 'What does this program print?',
  c: `
class Main {
    public static void main(String[] args) {
        System.out.println(3 * 3);
    }
}`,
  lang: 'java',                      // optional; defaults to 'java'
  o: { a: '6', b: '9', c: '33', d: 'Compilation error' },
  a: 'b',                            // the correct option
  e: 'Why b is right — one or two sentences of real reasoning.',
  w: {                               // one entry for each of the three WRONG options
    a: 'Why a is wrong.',
    c: 'Why c is wrong.',
    d: 'Why d is wrong.',
  },
  h: 'An optional nudge, shown on demand in practice mode only.',
  v: JAVA_OUT,                       // see below
}
```

The `v` (verify) field tells the JDK checker what to assert:

| Helper | Meaning |
|---|---|
| `JAVA_OUT` | run it; stdout must equal the correct option's text exactly |
| `out('line1\nline2')` | run it; stdout must equal this literal (use it whenever the output is multi-line, or the option text is prose rather than the literal output) |
| `COMPILE_ERR` | `javac` must reject the snippet |
| `throws('NullPointerException')` | must compile, then throw that exception |
| *(omitted)* | not mechanically checkable — concept, complexity, SQL, React |

Then:

```bash
npm run verify
```

A failure prints the keyed answer beside the program's real output, so a wrong key is obvious.

**To add a whole new topic:** add a `Topic` to the level in `src/data/levels.ts`, create
`src/data/questions/<topic-id>.ts` exporting `expand(level, topicId, prefix, seeds)`, and add it to
the arrays in `src/data/questions/index.ts`. The roadmap, practice chooser, exam builder and
analytics all pick it up automatically — nothing else needs editing.

### Adding SQL questions

Same shape, different file tree. Pick the topic file under `src/data/sql/questions/`, add a seed to
either the choice array or the write array, and run `npm run verify:sql`.

```ts
// a choice question — add to the first array
{
  id: '008',
  d: 'medium',
  t: 'predict',                 // mcq | predict | error | explain | schema
  n: 'Short title for lists',
  p: 'The prompt.',
  c: 'SELECT ...',              // optional snippet
  o: { a: '...', b: '...', c: '...', d: '...' },
  a: 'b',
  w: { a: 'why a is wrong', c: '...', d: '...' },
  e: 'Why b is right.',
  h: ['first hint', 'second hint'],
  tags: ['GROUP BY', 'HAVING'],
  // Lets the verifier confirm the key by running SQL rather than by review:
  v: { sql: 'SELECT COUNT(*) FROM employees', expect: '[[12]]' },
}
```

```ts
// an executable exercise — add to the second array
{
  id: 'W05',
  d: 'medium',
  n: 'Short title',
  p: 'What the learner has to produce.',
  sol: 'SELECT ...',            // the reference; its result IS the expected result
  starter: 'SELECT\nFROM employees;',   // optional; presence makes it a "complete" question
  cols: ['employee', 'total'],  // declaring columns makes the grader check the labels
  ordered: true,                // the question asked for an order, so order is graded
  rw: true,                     // the exercise may modify its own copy of the data
  e: 'How it works.',
  h: ['a nudge'],
  tags: ['GROUP BY'],
  rejects: [{ label: 'forgets DISTINCT', sql: 'SELECT ...' }],
}
```

`expect` for `v` is the JSON of the result rows, which the verifier prints when it disagrees — so
the fastest way to author one is to guess, run `npm run verify:sql`, and paste back what it says
the query actually returns. The same applies to `rejects`: the verifier executes each one and
fails the build if a query you labelled wrong produces the correct result.

### House rules for questions

- Realistic junior-screening material, not obscure puzzles.
- Every snippet must be valid, compilable Java unless the question is explicitly about a compile
  error.
- Exactly one defensible correct answer. If two readings are possible, rewrite the question.
- Distractors should be plausible — each one should correspond to a specific misconception, which
  is what its `w` entry then names.
- For SQL, prefer a `v` spec or an executable exercise over a question only a human can check.
  Anything the verifier can run is one less thing that can quietly rot.
- Label the dialect when the syntax is not portable, and put the difference in `dn`.

---

## Project structure

```
src/
  types/index.ts            Domain model: Question, Topic, ActiveExam, ExamResult, Settings, AppData
  data/
    levels.ts               The three roadmaps: levels, topics, ordering, difficulty
    questions/
      seed.ts               Compact authoring format + expander + verify helpers
      index.ts              Flattens every topic file into the bank, with lookup indexes
      l1-*.ts l2-*.ts l3-*.ts   One file per topic (21 files)
    bank-entry.ts           Entry point the verifier bundles
  lib/
    validation.ts           Structural audit of the bank
    exam.ts                 Exam engine: paper construction, deadline, scoring, finalisation
    progress.ts             Topic/level status, unlocking rules, "continue learning" target
    analytics.ts            Aggregates, weak topics, trends, recommendations
    storage.ts              ProgressRepository interface, localStorage impl, migration, export
    format.ts               Clock, duration, date and percentage formatting
  state/AppContext.tsx      Reducer, persistence effect, theme resolution, toasts
  components/
    ui/index.tsx            Buttons, cards, badges, progress, stat cards, empty states, toasts
    ui/Modal.tsx            Dialog with focus trap and Escape handling
    QuestionView.tsx        Question renderer, shared by practice / exam / review
    CodeBlock.tsx           Dependency-free Java/SQL/TSX syntax highlighter
    TopicCard.tsx           One roadmap entry — used identically by all three levels
    charts.tsx              Hand-rolled SVG trend and activity charts
    layout/AppShell.tsx     Sidebar, mobile drawer, theme toggle, exam banner
  pages/                    Dashboard, Roadmap, LevelDetails, Practice, Exam, ExamResults,
                            MistakeReview, Analytics, Settings, NotFound
```

The SQL major sits alongside it, sharing the design system, the UI primitives and the storage
layer, and adding what Java does not need: a query engine and executable grading.

```
src/
  types/sql.ts              SQL domain model: questions, topics, lessons, exams, progress
  lib/sql/                  The SQL engine — no dependencies, runs in the browser and in Node
    tokens.ts               Tokenizer
    ast.ts                  AST types
    parser.ts               Recursive-descent parser for the PostgreSQL subset taught here
    values.ts               Three-valued logic, coercion, ordering, LIKE, casting
    functions.ts            Scalar, aggregate and window function tables
    execute.ts              Executor: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> window -> SELECT
    database.ts             Dataset -> isolated in-memory database
    compare.ts              Result-set comparison, i.e. how a written query is marked
    index.ts                Public API and the safety policy (permissions, budgets)
  lib/
    sql-grading.ts          Grades an answer; names the kind of mistake where it can
    sql-exam.ts             Paper construction, deadline, scoring, topic breakdown
    sql-progress.ts         Topic/level status, unlocking, mastery, revision queues
    sql-validation.ts       Structural audit of the SQL bank
    highlight.ts            Shared tokenizer for CodeBlock and the SQL editor
    join-shapes.ts          Which rows each join type keeps
  data/sql/
    datasets.ts             The three practice databases
    levels.ts               Basics / Normal / Advanced, seven topics each
    lessons.ts              One lesson per topic; examples execute live
    exams.ts                Mock tests and final exams
    engine-tests.ts         102 engine conformance cases
    questions/              seed.ts + index.ts + 21 topic files
    bank-entry.ts           Entry point the SQL verifier bundles
    verify-entry.ts         Engine entry point the SQL verifier bundles
  components/sql/
    SqlEditor.tsx           Textarea over a highlighted backdrop — a real editor in ~80 lines
    SqlResultTable.tsx      Result grid, data tables, schema viewer
    SqlQuestionView.tsx     Renders both choice and executable questions
    JoinDiagram.tsx         Inline-SVG join diagrams
  pages/sql/                SqlDashboard, SqlLevel, SqlTopic, SqlPractice, SqlLabs,
                            SqlWorkbench, SqlTests, SqlExam, SqlResults, SqlProgress
scripts/
  verify-bank.mjs           Structural + JDK verification of the Java bank
  verify-sql.mjs            SQL engine conformance + bank audit + reference-solution execution
  e2e.mjs                   Headless-Chrome end-to-end suite, one session per major
```

The layers are deliberately separate: **UI components** know nothing about storage, the **exam
engine** is pure functions over ids and answers, **scoring** is independent of persistence, and the
**persistence layer** sits behind a `ProgressRepository` interface. Swapping `localStorage` for a
backend means writing one object with `load` / `save` / `clear` and passing it to `<AppProvider>` —
nothing above that line changes.

### Stack

React 19, TypeScript (strict), Vite 8, Tailwind CSS 3, `react-router-dom`, `lucide-react`.
Charts and syntax highlighting are hand-rolled rather than pulled in as dependencies — both are a
few dozen lines and would otherwise cost far more than they are worth.

The SQL engine is hand-rolled for the same reason: a WASM build of SQLite would dwarf the rest of
the bundle, would have to be fetched at run time, and would teach SQLite's dialect rather than the
PostgreSQL one the lessons describe. Writing it means the dialect taught, the dialect executed and
the dialect verified are the same dialect.

The production bundle is ~1.08 MB (308 KB gzipped). Most of that is question content: 514
questions across both majors, each with code, options and explanations. That content is needed on
nearly every route, so code-splitting it would add complexity without helping.

---

## The SQL major

### Three levels, 21 topics

**Basics** — reading one table: SELECT, DISTINCT, WHERE and the comparison operators, BETWEEN / IN
/ LIKE, NULL handling, ORDER BY and row limiting, the five aggregates, and tables, keys and basic
DML.

**Normal** — combining things: GROUP BY and HAVING, the join family, multi-table joins and the
duplicates they cause, subqueries with IN and EXISTS, COALESCE and CASE, set operations and
anti-joins, dates, strings and conditional DML.

**Advanced** — interview-grade: self / CROSS / FULL OUTER joins, CTEs including RECURSIVE, window
functions and ranking, running totals and LAG/LEAD and top-N-per-group, correlated subqueries and
conditional aggregation, normalization and schema design, indexes and transactions.

### Seven exercise types

Multiple choice, predict the output, find the error, explain the query, schema and relationships,
**write the query**, and complete the query. The last two execute what you write.

### Query execution

Queries run against an engine written for this project — tokenizer, recursive-descent parser and
executor — covering the PostgreSQL subset the lessons teach: every join type, grouping, set
operations, scalar / IN / EXISTS / correlated subqueries, derived tables, CTEs including
`RECURSIVE`, window functions with `PARTITION BY` and explicit `ROWS`/`RANGE` frames, and the
three DML statements.

It gets the awkward parts right on purpose, because several lessons are about them: three-valued
logic (`= NULL` matches nothing, `NOT IN` with a NULL returns nothing), `COUNT(*)` versus
`COUNT(column)`, PostgreSQL's NULL sort order, integer versus numeric division, and the
GROUP BY rule that rejects a bare column.

The safety policy lives in one place, `src/lib/sql/index.ts`:

- every run builds a **fresh copy** of the exercise dataset, so nothing a query does can be seen
  by another exercise, another attempt, or the dataset definition;
- read-only exercises **reject INSERT / UPDATE / DELETE before execution**, so the rule is enforced
  by the engine rather than hidden in the UI;
- step, row and wall-clock budgets stop a runaway cross product or a non-terminating recursive CTE
  from freezing the page;
- there is no filesystem, network, extension or administrative surface to reach in the first place
  — the engine is a pure function over in-memory arrays, and it never sees `localStorage`.

### How a written query is marked

By **results, not text**. Your query and the reference solution are both executed, and the two
result sets are compared. Two queries that differ in formatting, aliases or clause order both pass.
The comparison is strict about what SQL is strict about — row multiplicity, NULLs, and ordering
when the question asked for an order — and lenient about what it is not: column labels unless the
question names them, and row order when the question specified none.

When it does not match, the feedback names the kind of difference ("too many rows — check for a
join that duplicates rows, or a missing DISTINCT") rather than printing the answer.

### What `npm run verify:sql` actually proves

1. **102 engine conformance cases** — each a query plus the exact rows PostgreSQL would return,
   checked by hand against the dataset. The engine's correctness is tested directly, not only
   through the question bank.
2. **Structural audit** of all 232 questions: unique ids, valid topic and level, exactly one
   correct option, an explanation for every distractor, no duplicate prompts.
3. **Every reference solution is executed.** The expected result *is* whatever the reference query
   produces, so a question can never ask for something unachievable, and a dataset edit that
   invalidates a question fails here rather than in front of you. Declared output columns are
   checked against what the solution actually returns, and every listed near-miss query is proven
   to be genuinely wrong.
4. **66 multiple-choice keys are confirmed by execution** — the question carries a query and the
   expected rows, and the verifier runs it.

---

## Testing

`npm run test:e2e` runs 178 checks in a real browser — 88 for Programming, 90 for SQL.

The Programming half covers:

- All 14 routes render with no console errors, and sidebar navigation works.
- Practice mode hides the answer until submission, then shows the verdict, the reasoning and every
  distractor rationale; accuracy and flags persist.
- Exam mode never leaks an answer, stores an absolute deadline, and auto-saves answers, flags and
  position.
- **Refreshing mid-exam** keeps the deadline, answers and flags, returns to the live exam, and the
  clock keeps counting from where it should.
- The confirmation screen summarises answered/unanswered/flagged/time-left before submitting.
- Scoring matches the recorded answers; results expose explanations, retry and review actions.
- An exam whose deadline passed while the tab was closed submits itself, flagged as auto-submitted,
  with elapsed time capped at the allowance.
- Level 2 starts locked, a passing Level 1 final unlocks it, a level final stays gated behind its
  topic exams, and open mode unlocks everything.
- Both themes apply and persist.
- No horizontal page scroll at 375 / 768 / 1024 / 1280 px on four different pages.
- The mobile drawer opens from the trigger edge, locks the page behind it, closes cleanly, and
  releases on resize to desktop.
- Snippets are syntax highlighted and scroll inside their own box rather than pushing the page
  sideways.

The SQL half covers:

- All 13 SQL routes render with no console errors, and an unknown topic shows the not-found page.
- The sidebar lists both majors as separate sections, each with its three levels.
- A fresh profile reports zero progress and no invented best score.
- The engine really runs: the workbench returns rows from the dataset, and a malformed query is
  reported with a message rather than crashing the page.
- The JOIN lab renders a live result for all five join types and explains the two things that
  catch people out.
- Answering a SQL question persists into the SQL block **and leaves the Java stats untouched**.
- A query-writing exercise presents an editor, runs the query, marks a correct query correct and a
  wrong one wrong, says what differs, and reveals the reference solution.
- A read-only exercise rejects `DELETE`.
- The SQL exam stores an absolute deadline, auto-saves both option answers and typed queries,
  survives a reload without resetting the clock, records a per-question outcome for every
  question, and lands on a result page with a topic breakdown and an answer review.
- An expired SQL exam submits itself.
- Mock tests are open from the start; a level final is locked until its topic exams average the
  pass mark.
- Lesson examples execute live, and marking a lesson read persists.
- **A schema-1 payload is upgraded in place**: Java stats, flags, exam history and settings all
  survive, and the SQL block is created empty.
- No horizontal page scroll at 375 / 768 / 1280 px on five SQL pages, and the mobile editor uses a
  16px font so iOS does not zoom on focus.

---

## Notes and limitations

- **Storage is per-browser.** Progress does not follow you between browsers or devices unless you
  export the JSON and import it on the other side. Clearing site data erases it.
- **Private browsing** may block `localStorage`; the app degrades to in-memory for the session
  rather than crashing.
- Option order is fixed; exam **question** order is shuffled by default (toggleable in Settings).
  Options are not shuffled, because reordering them is the easiest way to silently break an answer
  key.
- The e2e suite is macOS-specific in one place: the Chrome path in `scripts/e2e.mjs`. Change that
  constant to run it elsewhere.
- **The SQL engine implements a subset.** It covers everything the lessons and the bank use, and it
  reports anything outside that subset as a clear error rather than guessing. There is no
  `EXPLAIN`, no real transaction isolation, no indexes, and no stored procedures or triggers —
  those topics are taught as concepts and assessed with multiple-choice questions, which is stated
  on the questions themselves rather than faked with a decorative Run button.
- **Grading compares results, so it cannot see intent.** A query that returns the right rows the
  wrong way round still passes; in particular the sargability exercise notes explicitly that its
  non-indexable variant returns identical rows and only `EXPLAIN` could tell them apart.
- `NATURAL JOIN` is deliberately rejected with a message telling you to write the join condition
  out, rather than being silently supported.
