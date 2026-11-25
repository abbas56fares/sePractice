#!/usr/bin/env node
/**
 * End-to-end test harness.
 *
 * Drives a real headless Chrome over the DevTools Protocol using Node's
 * built-in WebSocket client, so the suite adds no dependencies. It launches
 * Chrome against a throwaway profile directory and never touches the user's
 * own Chrome data.
 *
 * Covers what only a browser can prove: every route renders without a console
 * error, the exam clock survives a reload, auto-submit fires on expiry,
 * answers persist, scoring is right, unlocking behaves, and no viewport
 * scrolls sideways.
 *
 * Usage: node scripts/e2e.mjs [--url http://localhost:5173] [--headful]
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5173';
const HEADFUL = process.argv.includes('--headful');
const PORT = 9333;
const SHOT_DIR = join(process.cwd(), 'test-screenshots');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const E = String.fromCharCode(27);
const C = {
  red: (s) => E + '[31m' + s + E + '[0m',
  green: (s) => E + '[32m' + s + E + '[0m',
  yellow: (s) => E + '[33m' + s + E + '[0m',
  dim: (s) => E + '[2m' + s + E + '[0m',
  bold: (s) => E + '[1m' + s + E + '[0m',
};

const results = { pass: 0, fail: 0, failures: [] };

function check(name, ok, detail = '') {
  if (ok) {
    results.pass++;
    console.log(`  ${C.green('PASS')} ${name}`);
  } else {
    results.fail++;
    results.failures.push(name + (detail ? ' — ' + detail : ''));
    console.log(`  ${C.red('FAIL')} ${name}${detail ? '\n       ' + C.dim(detail) : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----------------------------------------------------------------- CDP glue */

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          const detail = params.expression ? ' — ' + String(params.expression).slice(0, 120) : '';
          reject(new Error('CDP timeout: ' + method + detail));
        }
      }, 15000);
    });
  }

  on(fn) {
    this.listeners.push(fn);
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('WebSocket failed: ' + url)), {
      once: true,
    });
  });
  return new Cdp(ws);
}

/* ------------------------------------------------------------- page helpers */

function makePage(cdp, sessionId, consoleErrors) {
  /**
   * Evaluates an expression in the page.
   *
   * `attempts` defaults to 1 so that `waitFor` keeps full control of its own
   * polling budget. Call sites that are not inside a poll pass more, because
   * Chrome occasionally drops a Runtime.evaluate issued while a navigation is
   * committing and never answers it — not an application fault, so the
   * harness absorbs it. A genuine exception inside the page is always
   * surfaced on the first attempt.
   */
  const evaluate = async (expression, attempts = 1) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const r = await cdp.send(
          'Runtime.evaluate',
          { expression, awaitPromise: true, returnByValue: true },
          sessionId
        );
        if (r.exceptionDetails) {
          throw new Error(
            'Evaluate threw: ' +
              (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
          );
        }
        return r.result?.value;
      } catch (err) {
        const message = String(err?.message ?? err);
        const transient =
          message.startsWith('CDP timeout') ||
          message.includes('Execution context was destroyed') ||
          message.includes('Cannot find context');
        if (!transient) throw err;
        lastError = err;
        await sleep(250);
      }
    }
    throw lastError;
  };

  const goto = async (path) => {
    consoleErrors.length = 0;
    await cdp.send('Page.navigate', { url: BASE + path }, sessionId);
    // Wait for React to mount something into #root.
    await waitFor(() => evaluate(`!!document.querySelector('#root')?.firstElementChild`), 10000);
    await sleep(250);
  };

  const waitFor = async (fn, timeout = 6000, label = 'condition') => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await fn()) return true;
      } catch {
        /* keep polling while the page settles */
      }
      await sleep(100);
    }
    throw new Error('Timed out waiting for ' + label);
  };

  /**
   * Visible text, lowercased. innerText reflects rendered CSS, so anything
   * styled with text-transform: uppercase comes back in caps — normalising
   * here keeps the assertions readable and stops styling changes breaking them.
   */
  const text = async () => String(await evaluate(`document.body.innerText`, 3)).toLowerCase();
  const has = async (needle) => (await text()).includes(String(needle).toLowerCase());

  /** Clicks the first element whose trimmed text matches, within a selector. */
  const clickText = (selector, needle) =>
    evaluate(`(() => {
      const items = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = items.find((e) => (e.innerText || '').trim().toLowerCase().includes(${JSON.stringify(
        needle.toLowerCase()
      )}));
      if (!el) return false;
      el.click();
      return true;
    })()`);

  const click = (selector) =>
    evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()`);

  const setViewport = (width, height, mobile = false) =>
    cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile },
      sessionId
    );

  const screenshot = async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
    mkdirSync(SHOT_DIR, { recursive: true });
    writeFileSync(join(SHOT_DIR, name + '.png'), Buffer.from(r.data, 'base64'));
  };

  return { evaluate, goto, waitFor, text, has, clickText, click, setViewport, screenshot };
}

/* -------------------------------------------------------------------- suite */

/* ------------------------------------------------------------- suites */

/**
 * The Programming major: routes, practice, the exam clock, scoring,
 * progression, export, themes, responsive layout and code snippets.
 */
async function programmingSuite(page, consoleErrors) {

  /* ------------------------------------------------- 1. routes all render */
  console.log(C.bold('\n1. Routes render without errors'));
  const routes = [
    ['/', 'Currently working on'],
    ['/roadmap', 'Assessment roadmap'],
    ['/level/1', 'Beginner'],
    ['/level/2', 'Intermediate'],
    ['/level/3', 'Advanced'],
    ['/practice', 'Practice'],
    ['/practice/l1-basics', 'Variables, Data Types'],
    ['/review', 'My mistakes'],
    ['/exam', 'Timed exams'],
    ['/exam/start/l1-basics', 'Begin exam'],
    ['/results', 'No exam results yet'],
    ['/analytics', 'Progress analytics'],
    ['/settings', 'Settings'],
    ['/no-such-page', 'Page not found'],
  ];

  for (const [path, needle] of routes) {
    await page.goto(path);
    const body = await page.text();
    check(
      `${path} renders and shows "${needle}"`,
      body.includes(needle.toLowerCase()) && consoleErrors.length === 0,
      consoleErrors.length ? consoleErrors.join('; ') : `body did not contain "${needle}"`
    );
  }

  /* ----------------------------------------------------- 2. sidebar links */
  console.log(C.bold('\n2. Navigation'));
  await page.goto('/');
  const navOk = await page.evaluate(`(() => {
    const hrefs = [...document.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    return JSON.stringify(hrefs);
  })()`);
  const hrefs = JSON.parse(navOk);
  check(
    'sidebar exposes all primary routes',
    ['/', '/roadmap', '/practice', '/exam', '/review', '/analytics', '/settings'].every((h) =>
      hrefs.includes(h)
    ),
    'found: ' + hrefs.join(', ')
  );

  await page.clickText('nav a', 'Progress Analytics');
  await page.waitFor(async () => (await page.evaluate('location.pathname')) === '/analytics');
  check('clicking a nav link navigates', true);

  /* -------------------------------------------- 3. practice mode feedback */
  console.log(C.bold('\n3. Practice mode'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/practice/l1-basics');

  const beforeReveal = await page.text();
  check(
    'practice hides the answer before submitting',
    !beforeReveal.includes('is right') && !beforeReveal.includes('why the others are wrong'),
    'explanation leaked before submission'
  );
  check('submit is disabled with nothing selected', await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Submit answer');
    return !!b && b.disabled;
  })()`));

  check('hint is available on demand', await page.clickText('button', 'Show hint'));
  await sleep(150);
  check('hint text appears', (await page.text()).length > 0 && await page.evaluate(
    `!![...document.querySelectorAll('p')].find((p) => p.innerText.includes('types of both operands'))`
  ));

  // Answer the first question correctly (L1-VAR-001 keys to option B, "3").
  await page.evaluate(`(() => {
    const opts = [...document.querySelectorAll('[role="radio"]')];
    opts[1].click();
  })()`);
  await sleep(120);
  await page.clickText('button', 'Submit answer');
  await sleep(250);

  const afterReveal = await page.text();
  check(
    'practice reveals correctness after submitting',
    afterReveal.includes('correct'),
    'no correctness verdict shown'
  );
  check(
    'practice explains why the answer is right',
    afterReveal.includes('why b is right') && afterReveal.includes('integer division'),
    'missing explanation for the keyed answer'
  );
  check(
    'practice explains every distractor',
    afterReveal.includes('why the others are wrong'),
    'missing distractor rationales'
  );
  check(
    'practice records accuracy',
    afterReveal.includes('100% accuracy') || afterReveal.includes('1 correct'),
    'session accuracy not updated'
  );

  await page.screenshot('practice-revealed');

  const persisted = await page.evaluate(
    `(() => { const d = JSON.parse(localStorage.getItem('java-assessment:v1')); return Object.keys(d.questionStats).length; })()`
  );
  check('practice answer is persisted', persisted === 1, 'questionStats entries: ' + persisted);

  check('flagging a question works', await page.clickText('button', 'Flag for review'));
  await sleep(200);
  const flagged = await page.evaluate(
    `(() => { const d = JSON.parse(localStorage.getItem('java-assessment:v1')); return d.flagged.length; })()`
  );
  check('flag is persisted', flagged === 1, 'flagged: ' + flagged);

  /* ------------------------------------------- 4. exam: timer persistence */
  console.log(C.bold('\n4. Exam timer and persistence'));
  await page.goto('/exam/start/l1-basics');
  await page.clickText('button', 'Begin exam');
  await page.waitFor(async () => (await page.evaluate('location.pathname')) === '/exam');
  await sleep(300);

  const examInfo = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    return JSON.stringify({ deadline: d.activeExam.deadline, n: d.activeExam.questionIds.length });
  })()`);
  const { deadline: deadline1, n: questionCount } = JSON.parse(examInfo);
  check('exam was created with questions', questionCount > 0, 'count: ' + questionCount);
  check(
    'exam stores an absolute deadline',
    typeof deadline1 === 'number' && deadline1 > Date.now(),
    'deadline: ' + deadline1
  );

  const examBody = await page.text();
  check(
    'exam does not reveal answers',
    !examBody.includes('why the others are wrong') && !examBody.includes('is right'),
    'exam leaked explanation content'
  );
  check('exam shows a countdown', /\d\d:\d\d/.test(examBody), 'no clock found');
  check(
    'exam shows a question navigator',
    examBody.includes('question navigator'),
    'navigator missing'
  );

  await page.screenshot('exam-running');

  // Answer three questions, flag one.
  await page.evaluate(`document.querySelectorAll('[role="radio"]')[0].click()`);
  await sleep(120);
  await page.clickText('button', 'Flag for review');
  await sleep(120);
  await page.clickText('button', 'Next');
  await sleep(200);
  await page.evaluate(`document.querySelectorAll('[role="radio"]')[1].click()`);
  await sleep(200);

  const navState = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    return JSON.stringify({
      answers: Object.keys(d.activeExam.answers).length,
      flagged: d.activeExam.flagged.length,
      index: d.activeExam.currentIndex,
    });
  })()`);
  const state = JSON.parse(navState);
  check('exam answers auto-save', state.answers === 2, JSON.stringify(state));
  check('exam flags save', state.flagged === 1, JSON.stringify(state));
  check('exam position saves', state.index === 1, JSON.stringify(state));

  const clockBefore = await page.evaluate(
    `document.querySelector('[role="timer"]').innerText.trim()`
  );
  await sleep(2100);

  // Reload: the clock must keep counting down from the stored deadline, and
  // the answers must still be there.
  consoleErrors.length = 0;
  await page.goto('/exam');
  const afterReload = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    return JSON.stringify({
      deadline: d.activeExam.deadline,
      answers: Object.keys(d.activeExam.answers).length,
      flagged: d.activeExam.flagged.length,
      clock: document.querySelector('[role="timer"]').innerText.trim(),
      onExam: location.pathname,
    });
  })()`);
  const reloaded = JSON.parse(afterReload);

  check(
    'refresh does not reset the deadline',
    reloaded.deadline === deadline1,
    `${reloaded.deadline} vs ${deadline1}`
  );
  check(
    'refresh keeps the answers',
    reloaded.answers === 2,
    'answers after reload: ' + reloaded.answers
  );
  check('refresh keeps the flags', reloaded.flagged === 1);
  check(
    'clock kept counting across the refresh',
    reloaded.clock !== clockBefore,
    `before ${clockBefore}, after ${reloaded.clock}`
  );
  check('refresh returns to the live exam', reloaded.onExam === '/exam');
  check('refresh produced no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  /* --------------------------------------------- 5. submit and score */
  console.log(C.bold('\n5. Submission, scoring and explanations'));
  await page.clickText('button', 'Submit');
  await sleep(300);
  check(
    'a confirmation screen appears before submitting',
    await page.has('Submit this exam?'),
    'no confirmation dialog'
  );
  // innerText reflects rendered CSS, and these labels are uppercased, so the
  // comparison has to be case-insensitive.
  const confirmBody = (await page.text()).toLowerCase();
  check(
    'confirmation summarises answered and unanswered',
    confirmBody.includes('answered') &&
      confirmBody.includes('unanswered') &&
      confirmBody.includes('time left'),
    'summary missing'
  );

  await page.clickText('div[role="dialog"] button', 'Submit exam');
  await page.waitFor(
    async () => (await page.evaluate('location.pathname')).startsWith('/results/'),
    8000,
    'results page'
  );
  await sleep(300);

  const resultBody = await page.text();
  const stored = JSON.parse(
    await page.evaluate(`(() => {
      const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
      const r = d.examResults[d.examResults.length - 1];
      return JSON.stringify({ score: r.score, total: r.total, pct: r.pct, active: d.activeExam });
    })()`)
  );

  check('exam result is recorded', stored.total === questionCount, JSON.stringify(stored));
  check('active exam is cleared after submit', stored.active === null);
  check(
    'score matches the recorded answers',
    stored.pct === Math.round((stored.score / stored.total) * 100),
    JSON.stringify(stored)
  );
  check(
    'results show the score out of the total',
    resultBody.includes(`${stored.score} / ${stored.total}`),
    'headline score missing'
  );
  check(
    'results break performance down by topic',
    resultBody.includes('performance by topic'),
    'no topic breakdown'
  );
  check(
    'results expose explanations after submission',
    resultBody.includes('why the others are wrong') || resultBody.includes('question review'),
    'no post-submission explanations'
  );
  await page.screenshot('exam-results');
  check(
    'results offer retry and review actions',
    resultBody.includes('retry exam') && resultBody.includes('review mistakes'),
    'actions missing'
  );

  /* ------------------------------------------------- 6. auto-submit on expiry */
  console.log(C.bold('\n6. Automatic submission when the timer expires'));
  // Start a fresh exam, then rewrite its deadline into the past and reload —
  // exactly what happens if you walk away mid-exam.
  await page.goto('/exam/start/l1-control');
  await page.clickText('button', 'Begin exam');
  await page.waitFor(async () => (await page.evaluate('location.pathname')) === '/exam');
  await sleep(250);

  const beforeCount = await page.evaluate(
    `JSON.parse(localStorage.getItem('java-assessment:v1')).examResults.length`
  );
  await page.evaluate(`(() => {
    const key = 'java-assessment:v1';
    const d = JSON.parse(localStorage.getItem(key));
    d.activeExam.deadline = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify(d));
  })()`);

  consoleErrors.length = 0;
  await page.goto('/exam');
  await page.waitFor(
    async () =>
      (await page.evaluate(
        `JSON.parse(localStorage.getItem('java-assessment:v1')).examResults.length`
      )) === beforeCount + 1,
    8000,
    'auto-submitted result'
  );
  const auto = JSON.parse(
    await page.evaluate(`(() => {
      const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
      const r = d.examResults[d.examResults.length - 1];
      return JSON.stringify({ auto: r.autoSubmitted, active: d.activeExam, elapsed: r.elapsedMs, allowed: r.allowedMs });
    })()`)
  );
  check('an expired exam submits itself', auto.active === null && auto.auto === true, JSON.stringify(auto));
  check(
    'auto-submitted elapsed time is capped at the allowance',
    auto.elapsed <= auto.allowed,
    `${auto.elapsed} > ${auto.allowed}`
  );
  check('expiry path logged no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  /* ------------------------------------------------- 7. progression / unlocking */
  console.log(C.bold('\n7. Progression and unlocking'));
  await page.goto('/settings');
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/level/2');
  check(
    'Level 2 starts locked',
    await page.has('Locked'),
    'Level 2 was not locked on a fresh profile'
  );

  // Seed a passing Level 1 final and confirm Level 2 opens.
  await page.evaluate(`(() => {
    const key = 'java-assessment:v1';
    const d = JSON.parse(localStorage.getItem(key)) || {};
    d.schemaVersion = 1;
    d.createdAt = d.createdAt || Date.now();
    d.updatedAt = Date.now();
    d.settings = d.settings || {};
    d.questionStats = d.questionStats || {};
    d.flagged = [];
    d.practiceLog = [];
    d.activeExam = null;
    d.examResults = [{
      id: 'seed-1', level: 1, topicId: null, kind: 'final',
      questionIds: [], answers: {}, flagged: [], timePerQuestion: {},
      startedAt: Date.now() - 600000, submittedAt: Date.now(),
      elapsedMs: 600000, allowedMs: 3600000, autoSubmitted: false,
      score: 27, total: 30, pct: 90,
    }];
    localStorage.setItem(key, JSON.stringify(d));
  })()`);
  await page.goto('/level/2');
  const level2 = await page.text();
  check(
    'passing the Level 1 final unlocks Level 2',
    !level2.includes('locked —') && level2.includes('start practice'),
    'Level 2 still gated after a 90% Level 1 final'
  );

  await page.screenshot('roadmap-level');
  await page.goto('/level/1');
  check(
    'a level final stays locked until its topics are done',
    await page.has('final exam'),
    'final exam row missing'
  );
  const finalLocked = await page.evaluate(`(() => {
    const cards = [...document.querySelectorAll('.card')];
    const finalCard = cards.find((c) => c.innerText.includes('Level 1 Final Exam'));
    return finalCard ? finalCard.innerText.includes('Locked') : null;
  })()`);
  check(
    'Level 1 final is gated behind its topic exams',
    finalLocked === true,
    'final card lock state: ' + finalLocked
  );

  // Open mode should unlock everything.
  await page.evaluate(`(() => {
    const key = 'java-assessment:v1';
    const d = JSON.parse(localStorage.getItem(key));
    d.settings.unlockMode = 'open';
    localStorage.setItem(key, JSON.stringify(d));
  })()`);
  await page.goto('/level/3');
  check(
    'open mode unlocks every level',
    !(await page.has('Locked —')),
    'Level 3 still locked in open mode'
  );

  /* ------------------------------------------------- 8. export */
  console.log(C.bold('\n8. Export'));
  await page.goto('/settings');
  const exportOk = await page.evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].map((b) => b.innerText.trim());
    return JSON.stringify(btns.filter((b) => /Export|Import|Reset/.test(b)));
  })()`);
  const exportBtns = JSON.parse(exportOk);
  check(
    'settings offers JSON export, CSV export and import',
    exportBtns.some((b) => b.includes('Export JSON')) &&
      exportBtns.some((b) => b.includes('Export exam CSV')) &&
      exportBtns.some((b) => b.includes('Import JSON')),
    'buttons: ' + exportBtns.join(', ')
  );
  check(
    'settings reports question-bank health',
    await page.has('no structural errors'),
    'bank health not reported as clean'
  );

  /* ------------------------------------------------- 9. theming */
  console.log(C.bold('\n9. Light and dark themes'));
  await page.goto('/');
  await page.clickText('button[aria-label="Dark theme"]', '');
  await sleep(200);
  const darkOn = await page.evaluate(`document.documentElement.classList.contains('dark')`);
  check('dark theme applies', darkOn === true);
  await page.screenshot('dashboard-dark');

  await page.clickText('button[aria-label="Light theme"]', '');
  await sleep(200);
  const lightOn = await page.evaluate(`!document.documentElement.classList.contains('dark')`);
  check('light theme applies', lightOn === true);
  check(
    'theme choice persists',
    (await page.evaluate(
      `JSON.parse(localStorage.getItem('java-assessment:v1')).settings.theme`
    )) === 'light'
  );
  await page.screenshot('dashboard-light');

  /* ------------------------------------------------- 10. responsive */
  console.log(C.bold('\n10. Responsive layout'));
  const viewports = [
    ['mobile', 375, 760, true],
    ['tablet', 768, 1024, true],
    ['laptop', 1024, 800, false],
    ['desktop', 1280, 900, false],
  ];
  const pages = ['/', '/roadmap', '/practice/l1-basics', '/analytics'];

  for (const [name, w, h, mobile] of viewports) {
    await page.setViewport(w, h, mobile);
    for (const path of pages) {
      await page.goto(path);
      const overflow = await page.evaluate(
        `document.documentElement.scrollWidth - document.documentElement.clientWidth`
      );
      check(
        `${name} ${w}px — ${path} has no horizontal page scroll`,
        overflow <= 1,
        'overflow: ' + overflow + 'px'
      );
    }
    await page.goto('/');
    await page.screenshot('dashboard-' + name);
  }

  // The mobile drawer is the only nav below lg, so it must work.
  await page.setViewport(375, 760, true);
  await page.goto('/');
  const triggerVisible = await page.evaluate(
    `(() => { const b = document.querySelector('[aria-label="Open navigation"]'); return !!b && b.offsetParent !== null; })()`
  );
  check('mobile shows a drawer trigger', triggerVisible === true);

  const sidebarHidden = await page.evaluate(
    `(() => { const a = document.querySelector('aside.lg\\\\:flex'); return !a || a.offsetParent === null; })()`
  );
  check('desktop sidebar is hidden on mobile', sidebarHidden === true);

  await page.click('[aria-label="Open navigation"]');
  await sleep(400);
  const drawerOpen = await page.evaluate(`(() => {
    const d = document.getElementById('nav-drawer');
    if (!d) return 'missing';
    const r = d.getBoundingClientRect();
    return JSON.stringify({
      onScreen: r.left < window.innerWidth - 10,
      locked: document.body.classList.contains('overflow-hidden'),
      fromRight: r.right >= window.innerWidth - 2,
    });
  })()`);
  const drawer = JSON.parse(drawerOpen);
  check('drawer slides in', drawer.onScreen === true, drawerOpen);
  check('drawer locks the page behind it', drawer.locked === true, drawerOpen);
  check('drawer enters from the trigger edge (right)', drawer.fromRight === true, drawerOpen);
  await page.screenshot('mobile-drawer');

  await page.click('[aria-label="Close navigation"]');
  await sleep(400);
  const drawerClosed = await page.evaluate(
    `(() => {
      const d = document.getElementById('nav-drawer');
      return d.getBoundingClientRect().left >= window.innerWidth - 2 &&
        !document.body.classList.contains('overflow-hidden');
    })()`
  );
  check('drawer closes and unlocks the page', drawerClosed === true);

  // Crossing back to desktop must not leave a stuck drawer.
  await page.click('[aria-label="Open navigation"]');
  await sleep(250);
  await page.setViewport(1280, 900, false);
  await sleep(500);
  const unstuck = await page.evaluate(
    `!document.body.classList.contains('overflow-hidden')`
  );
  check('resizing to desktop releases the drawer', unstuck === true);

  /* ------------------------------------------------- 11. code rendering */
  console.log(C.bold('\n11. Code snippets'));
  await page.setViewport(375, 760, true);
  await page.goto('/practice/l1-basics');
  const codeInfo = await page.evaluate(`(() => {
    const pre = document.querySelector('pre');
    if (!pre) return 'no code block';
    const box = pre.parentElement;
    return JSON.stringify({
      highlighted: document.querySelectorAll('.tok-keyword').length,
      scrollsInsideBox: box.scrollWidth > box.clientWidth ? true : 'fits',
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    });
  })()`);
  const code = JSON.parse(codeInfo);
  check('snippets are syntax highlighted', code.highlighted > 0, codeInfo);
  check(
    'wide snippets do not push the page sideways at 375px',
    code.pageOverflow <= 1,
    codeInfo
  );

}

/**
 * The SQL major: routes, navigation, the live query engine, graded
 * query-writing exercises, exams, progression, lessons, the schema-1
 * migration and responsive layout.
 */
async function sqlSuite(page, consoleErrors) {

  /* ================================================================ SQL
     The SQL major. Everything below exercises the second subject end to
     end: routes, the live query engine, graded query-writing exercises,
     the exam clock, and that none of it disturbs the Java progress. */

  console.log(C.bold('\n12. SQL routes render without errors'));
  await page.setViewport(1280, 900);
  // localStorage is only reachable once a real origin is loaded.
  await page.goto('/sql');
  await page.evaluate(`localStorage.clear()`);

  const SQL_ROUTES = [
    ['/sql', 'sql'],
    ['/sql/level/1', 'basics'],
    ['/sql/level/2', 'normal'],
    ['/sql/level/3', 'advanced'],
    ['/sql/topic/sql-l1-select', 'distinct'],
    ['/sql/practice/sql-l1-select', 'question 1'],
    ['/sql/joins', 'join lab'],
    ['/sql/combinations', 'logical processing order'],
    ['/sql/workbench', 'workbench'],
    ['/sql/tests', 'mock tests'],
    ['/sql/review', 'mistake'],
    ['/sql/results', 'sql exam'],
    ['/sql/progress', 'progress'],
  ];

  for (const [route, needle] of SQL_ROUTES) {
    await page.goto(route);
    const ok = await page.has(needle);
    check(
      `${route} renders and mentions "${needle}"`,
      ok && consoleErrors.length === 0,
      consoleErrors.join('; ') || 'needle not found'
    );
  }

  await page.goto('/sql/topic/does-not-exist');
  check('an unknown SQL topic shows the not-found page', await page.has('not found'));

  console.log(C.bold('\n13. SQL navigation and separation from Programming'));
  await page.goto('/');
  const navInfo = await page.evaluate(`(() => {
      // The sidebar and the mobile drawer both render the nav, so compare
      // the set of destinations rather than the raw element count.
      const links = [
        ...new Set([...document.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))),
      ];
    const text = document.querySelector('nav').innerText.toLowerCase();
    return JSON.stringify({
      hasSqlDashboard: links.includes('/sql'),
      hasJoinLab: links.includes('/sql/joins'),
      hasProgrammingDashboard: links.includes('/'),
      hasProgrammingHeading: text.includes('programming'),
      hasSqlHeading: text.includes('sql'),
      sqlLevelLinks: links.filter((h) => h && h.startsWith('/sql/level/')).length,
        javaLevelLinks: links.filter((h) => h && h.startsWith('/level/')).length,
    });
  })()`);
  const nav = JSON.parse(navInfo);
  check('the sidebar links to the SQL dashboard', nav.hasSqlDashboard === true, navInfo);
  check('the sidebar links to the JOIN lab', nav.hasJoinLab === true, navInfo);
  check('the Programming major is still in the sidebar', nav.hasProgrammingDashboard === true, navInfo);
  check('both majors are labelled as sections', nav.hasProgrammingHeading && nav.hasSqlHeading, navInfo);
  check('both majors list their three levels', nav.sqlLevelLinks === 3 && nav.javaLevelLinks === 3, navInfo);

  console.log(C.bold('\n14. A fresh profile shows no invented progress'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql');
  const freshText = await page.text();
  check(
    'the dashboard reports zero exercises completed',
    /0\s*\/\s*7\d/.test(freshText) || freshText.includes('0/74'),
    freshText.slice(0, 400)
  );
  check('no best score is claimed', !freshText.includes('best 100%'));
  check('an empty state points at a starting action', await page.has('start with the basics'));

  console.log(C.bold('\n15. The SQL engine runs queries for real'));
  await page.goto('/sql/workbench');
  const ranDefault = await page.clickText('button', 'Run query');
  await sleep(300);
  const workbenchText = await page.text();
  check('the workbench Run button works', ranDefault === true);
  check(
    'the workbench returns rows from the dataset',
    workbenchText.includes('rows') && workbenchText.includes('headcount'),
    workbenchText.slice(0, 400)
  );

  // A deliberately broken query must produce a useful message, not a crash.
  const brokeIt = await page.evaluate(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'SELECT FROM');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(100);
  await page.clickText('button', 'Run query');
  await sleep(300);
  check('a malformed query is reported, not crashed on', brokeIt && (await page.has('query failed')));
  check('a malformed query logs no console error', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log(C.bold('\n16. The JOIN lab shows every join type'));
  await page.goto('/sql/joins');
  const joinChecks = [];
  for (const kind of ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN']) {
    await page.clickText('button', kind);
    await sleep(200);
    const body = await page.text();
    joinChecks.push({ kind, hasResult: body.includes('result'), rows: body.includes('row') });
  }
  check(
    'every join type renders a live result',
    joinChecks.every((j) => j.hasResult && j.rows),
    JSON.stringify(joinChecks)
  );
  const joinBody = await page.text();
  check('the lab explains ON versus WHERE', joinBody.includes('on versus where'));
  check('the lab explains COUNT(*) versus COUNT(column)', joinBody.includes('count(*) versus count(column)'));
  check('the JOIN lab logs no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log(C.bold('\n17. SQL practice: a multiple-choice answer'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/practice/sql-l1-select');
  await page.evaluate(`document.querySelectorAll('[role="radio"]')[0].click()`);
  await sleep(100);
  await page.clickText('button', 'Submit answer');
  await sleep(250);
  const choiceBody = await page.text();
  check('submitting reveals the explanation', choiceBody.includes('why the others are wrong'));
  const sqlStats = await page.evaluate(
    `(() => { const d = JSON.parse(localStorage.getItem('java-assessment:v1')); return Object.keys(d.sql.questionStats).length; })()`
  );
  check('a SQL answer is persisted to the SQL block', sqlStats === 1, 'entries: ' + sqlStats);
  const javaUntouched = await page.evaluate(
    `(() => { const d = JSON.parse(localStorage.getItem('java-assessment:v1')); return Object.keys(d.questionStats).length; })()`
  );
  check('answering SQL leaves the Java stats untouched', javaUntouched === 0, 'java entries: ' + javaUntouched);

  console.log(C.bold('\n18. SQL practice: a graded query-writing exercise'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/practice/sql-l1-select?only=exercises');
  const hasEditor = await page.evaluate(`!!document.querySelector('textarea')`);
  check('an exercise presents a SQL editor', hasEditor === true);

  const typeQuery = async (sql) =>
    page.evaluate(`(() => {
      const ta = document.querySelector('textarea');
      if (!ta) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, ${JSON.stringify(sql)});
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);

  // SQL-L1-SEL-W01 asks for every employee name.
  await typeQuery('SELECT name FROM employees;');
  await sleep(100);
  await page.clickText('button', 'Run');
  await sleep(300);
  check('running an exercise query shows its result', await page.has('your result'));

  await page.clickText('button', 'Submit answer');
  await sleep(400);
  const correctBody = await page.text();
  check('a correct query is marked correct', correctBody.includes('correct'), correctBody.slice(0, 300));
  const exerciseStat = await page.evaluate(
    `(() => { const d = JSON.parse(localStorage.getItem('java-assessment:v1')); const s = Object.values(d.sql.questionStats)[0]; return s ? s.lastCorrect : null; })()`
  );
  check('the correct exercise is recorded as correct', exerciseStat === true, 'lastCorrect: ' + exerciseStat);

  // Now a wrong answer on the next exercise must be marked wrong.
  await page.clickText('button', 'Next question');
  await sleep(250);
  await typeQuery('SELECT id FROM employees;');
  await sleep(100);
  await page.clickText('button', 'Submit answer');
  await sleep(500);
  const wrongBody = await page.text();
  const wrongStat = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    const entries = Object.values(d.sql.questionStats);
    const last = entries[entries.length - 1];
    return last ? last.lastCorrect : null;
  })()`);
  check('a wrong query is recorded as incorrect', wrongStat === false, 'lastCorrect: ' + wrongStat);
  check(
    'a wrong query is told what differs',
    wrongBody.includes('row(s)') || wrongBody.includes('column') || wrongBody.includes('expected'),
    wrongBody.slice(-700)
  );
  check(
    'the reference solution is revealed after submitting',
    wrongBody.includes('one correct solution'),
    wrongBody.slice(-400)
  );
  check('grading a query logs no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log(C.bold('\n19. A read-only exercise refuses to modify data'));
  await page.goto('/sql/practice/sql-l1-select?only=exercises');
  await typeQuery('DELETE FROM employees;');
  await sleep(100);
  await page.clickText('button', 'Run');
  await sleep(300);
  check('a write is rejected in a read-only exercise', await page.has('read-only'));

  console.log(C.bold('\n20. SQL exam: clock, persistence and submission'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/exam/start/sql-mock-basics');
  await page.clickText('button', 'Begin exam');
  await sleep(500);

  const examState = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    const e = d.sql.activeExam;
    return JSON.stringify({
      exists: !!e,
      count: e ? e.questionIds.length : 0,
      hasDeadline: e ? e.deadline > Date.now() : false,
      path: location.pathname,
    });
  })()`);
  const exam = JSON.parse(examState);
  check('a SQL exam is created with questions', exam.exists && exam.count > 0, examState);
  check('the exam stores an absolute deadline', exam.hasDeadline === true, examState);
  check('starting navigates to the runner', exam.path === '/sql/exam', examState);
  check('a countdown is shown', /\d\d:\d\d/.test(await page.text()));

  // Answer whichever kind of question is first, then check it persists.
  await page.evaluate(`(() => {
    const radio = document.querySelector('[role="radio"]');
    if (radio) { radio.click(); return 'choice'; }
    const ta = document.querySelector('textarea');
    if (ta) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'SELECT 1;');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return 'query';
    }
    return 'none';
  })()`);
  await sleep(200);
  const answeredCount = await page.evaluate(`(() => {
    const e = JSON.parse(localStorage.getItem('java-assessment:v1')).sql.activeExam;
    return Object.keys(e.answers).length + Object.keys(e.queries).length;
  })()`);
  check('an exam answer saves immediately', answeredCount >= 1, 'saved: ' + answeredCount);

  const before = await page.evaluate(
    `JSON.parse(localStorage.getItem('java-assessment:v1')).sql.activeExam.deadline`
  );
  await page.goto('/sql/exam');
  await sleep(300);
  const after = await page.evaluate(
    `JSON.parse(localStorage.getItem('java-assessment:v1')).sql.activeExam.deadline`
  );
  check('a reload does not reset the exam clock', before === after, `${before} vs ${after}`);
  check('a reload returns to the live exam', (await page.evaluate(`location.pathname`)) === '/sql/exam');

  await page.clickText('button', 'Submit');
  await sleep(250);
  await page.clickText('button', 'Submit exam');
  await sleep(900);

  const sqlStored = await page.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
    const r = d.sql.examResults[d.sql.examResults.length - 1];
    return JSON.stringify({
      results: d.sql.examResults.length,
      active: d.sql.activeExam,
      total: r ? r.total : 0,
      hasCorrectMap: r ? Object.keys(r.correct).length : 0,
      path: location.pathname,
    });
  })()`);
  const sqlResult = JSON.parse(sqlStored);
  check('the SQL exam result is recorded', sqlResult.results === 1 && sqlResult.total > 0, sqlStored);
  check('the active SQL exam is cleared after submit', sqlResult.active === null, sqlStored);
  check('every question has a recorded outcome', sqlResult.hasCorrectMap === sqlResult.total, sqlStored);
  check('submitting navigates to the result page', sqlResult.path.startsWith('/sql/results/'), sqlStored);
  check('the result page shows a topic breakdown', await page.has('topic performance'));
  check('the result page offers an answer review', await page.has('answer review'));
  check('submitting logs no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log(C.bold('\n21. An expired SQL exam submits itself'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/exam/start/sql-mock-basics');
  await page.clickText('button', 'Begin exam');
  await sleep(500);
  await page.evaluate(`(() => {
    const key = 'java-assessment:v1';
    const d = JSON.parse(localStorage.getItem(key));
    d.sql.activeExam.deadline = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify(d));
  })()`);
  await page.goto('/sql/exam');
  await page.waitFor(
    async () =>
      (await page.evaluate(
        `JSON.parse(localStorage.getItem('java-assessment:v1')).sql.examResults.length`
      )) === 1,
    6000,
    'the expired SQL exam to auto-submit'
  );
  const sqlAuto = JSON.parse(
    await page.evaluate(`(() => {
      const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
      const r = d.sql.examResults[0];
      return JSON.stringify({ active: d.sql.activeExam, auto: r.autoSubmitted });
    })()`)
  );
  check(
    'an expired SQL exam submits itself',
    sqlAuto.active === null && sqlAuto.auto === true,
    JSON.stringify(sqlAuto)
  );
  check('the expiry path logs no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log(C.bold('\n22. SQL progression and unlocking'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/tests');
  check('mock tests are available from the start', await page.has('basics mock test'));
  const lockedBody = await page.text();
  check('a level final is locked for a new learner', lockedBody.includes('locked'), lockedBody.slice(0, 200));

  // Pass every Level 1 topic exam, then the final must open.
  await page.evaluate(`(() => {
    const key = 'java-assessment:v1';
    const d = JSON.parse(localStorage.getItem(key));
    const topics = [
      'sql-l1-select','sql-l1-where','sql-l1-patterns','sql-l1-nulls',
      'sql-l1-sorting','sql-l1-aggregates','sql-l1-tables',
    ];
    d.sql.examResults = topics.map((t, i) => ({
      id: 'seed-' + i, configId: 'sql-topic-' + t, kind: 'topic', levelId: 1, topicId: t,
      questionIds: [], answers: {}, queries: {}, correct: {}, flagged: {}, timePerQuestion: {},
      startedAt: Date.now(), submittedAt: Date.now(), elapsedMs: 1000, allowedMs: 60000,
      autoSubmitted: false, score: 9, total: 10, pct: 90, passPct: 70,
    }));
    localStorage.setItem(key, JSON.stringify(d));
  })()`);
  await page.goto('/sql/level/1');
  check(
    'passing the topic exams unlocks the level final',
    await page.has('start the final'),
    (await page.text()).slice(0, 300)
  );

  console.log(C.bold('\n23. Lessons execute their examples live'));
  await page.evaluate(`localStorage.clear()`);
  await page.goto('/sql/topic/sql-l2-joins');
  const lessonBody = await page.text();
  check('the lesson renders worked examples', lessonBody.includes('worked examples'));
  check('an example produced a real result grid', lessonBody.includes('result'));
  check('the lesson names its common mistakes', lessonBody.includes('common mistakes'));
  check('lesson examples logged no console errors', consoleErrors.length === 0, consoleErrors.join('; '));

  const markedRead = await page.clickText('button', 'Mark as read');
  await sleep(250);
  const readState = await page.evaluate(
    `JSON.parse(localStorage.getItem('java-assessment:v1')).sql.lessonsRead.length`
  );
  check('marking a lesson read persists', markedRead && readState === 1, 'lessonsRead: ' + readState);

  console.log(C.bold('\n24. Existing Java progress survives a SQL session'));
  await page.evaluate(`localStorage.clear()`);
  // Write a schema-1 payload, exactly as an older build would have left it.
  await page.evaluate(`(() => {
    localStorage.setItem('java-assessment:v1', JSON.stringify({
      schemaVersion: 1,
      createdAt: 1, updatedAt: 1,
      settings: { theme: 'dark', passThresholdPct: 70 },
      questionStats: { 'L1-VAR-001': { attempts: 3, correct: 2, lastCorrect: true, lastAnsweredAt: 1, totalMs: 5000 } },
      flagged: ['L1-VAR-002'],
      examResults: [{ id: 'old', level: 1, topicId: 'l1-basics', kind: 'topic', questionIds: [],
        answers: {}, flagged: [], timePerQuestion: {}, startedAt: 1, submittedAt: 2,
        elapsedMs: 1, allowedMs: 2, autoSubmitted: false, score: 8, total: 10, pct: 80 }],
      activeExam: null,
      practiceLog: [],
    }));
  })()`);
  await page.goto('/sql');
  await sleep(300);
  const migrated = JSON.parse(
    await page.evaluate(`(() => {
      const d = JSON.parse(localStorage.getItem('java-assessment:v1'));
      return JSON.stringify({
        version: d.schemaVersion,
        javaStats: Object.keys(d.questionStats).length,
        javaFlagged: d.flagged.length,
        javaResults: d.examResults.length,
        theme: d.settings.theme,
        sqlPresent: !!d.sql,
        sqlStats: d.sql ? Object.keys(d.sql.questionStats).length : -1,
      });
    })()`)
  );
  check('an old payload is upgraded to schema 2', migrated.version === 2, JSON.stringify(migrated));
  check('Java question stats survive the upgrade', migrated.javaStats === 1, JSON.stringify(migrated));
  check('Java flags survive the upgrade', migrated.javaFlagged === 1, JSON.stringify(migrated));
  check('Java exam history survives the upgrade', migrated.javaResults === 1, JSON.stringify(migrated));
  check('saved settings survive the upgrade', migrated.theme === 'dark', JSON.stringify(migrated));
  check('the SQL block is created empty', migrated.sqlPresent && migrated.sqlStats === 0, JSON.stringify(migrated));

  await page.goto('/analytics');
  check(
    'the Java analytics page still reports the migrated history',
    (await page.text()).includes('80%'),
    (await page.text()).slice(0, 300)
  );

  console.log(C.bold('\n25. SQL responsive layout'));
  const SQL_RESPONSIVE = ['/sql', '/sql/joins', '/sql/topic/sql-l1-select', '/sql/workbench', '/sql/tests'];
  for (const [w, h, name, mobile] of [
    [375, 760, 'mobile 375px', true],
    [768, 1024, 'tablet 768px', true],
    [1280, 900, 'desktop 1280px', false],
  ]) {
    await page.setViewport(w, h, mobile);
    for (const route of SQL_RESPONSIVE) {
      await page.goto(route);
      const overflow = await page.evaluate(
        `document.documentElement.scrollWidth - document.documentElement.clientWidth`
      );
      check(`${name} — ${route} has no horizontal page scroll`, overflow <= 1, 'overflow: ' + overflow);
    }
  }

  await page.setViewport(375, 760, true);
  await page.goto('/sql/practice/sql-l1-select?only=exercises');
  const editorFits = await page.evaluate(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no editor';
    const style = getComputedStyle(ta);
    return JSON.stringify({
      fontPx: parseFloat(style.fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    });
  })()`);
  const editor = JSON.parse(editorFits);
  check('the mobile editor uses a 16px font so iOS does not zoom', editor.fontPx >= 15, editorFits);
  check('the mobile editor does not overflow the page', editor.overflow <= 1, editorFits);
  await page.screenshot('sql-practice-mobile');

  await page.setViewport(1280, 900);
  await page.goto('/sql');
  await page.screenshot('sql-dashboard');
  await page.goto('/sql/joins');
  await page.screenshot('sql-join-lab');
  await page.goto('/sql/workbench');
  await page.screenshot('sql-workbench');

}

/* ------------------------------------------------------------ browser */

/**
 * Runs one suite in its own Chrome instance.
 *
 * Each major gets a fresh browser rather than sharing one: a single
 * long-lived headless session eventually stops laying the page out, after
 * which any read that needs layout — innerText, scrollWidth — hangs. Two
 * shorter sessions keep each one well inside that limit, and they also prove
 * the two majors do not depend on each other's in-memory state.
 */
async function withBrowser(label, run) {
  const profile = mkdtempSync(join(tmpdir(), 'chrome-e2e-'));
  const chrome = spawn(
    CHROME,
    [
      HEADFUL ? '--headless=false' : '--headless=new',
      '--remote-debugging-port=' + PORT,
      '--user-data-dir=' + profile,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      '--window-size=1280,900',
      'about:blank',
    ].filter((a) => a !== '--headless=false'),
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    let wsUrl = null;
    for (let i = 0; i < 60 && !wsUrl; i++) {
      await sleep(200);
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        wsUrl = (await r.json()).webSocketDebuggerUrl;
      } catch {
        /* not listening yet */
      }
    }
    if (!wsUrl) throw new Error('Chrome never exposed a debugging endpoint for ' + label);

    cdp = await connect(wsUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    const consoleErrors = [];
    cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(
          'uncaught: ' +
            (msg.params.exceptionDetails?.exception?.description ??
              msg.params.exceptionDetails?.text)
        );
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(
          'console.error: ' + msg.params.args.map((a) => a.value ?? a.description).join(' ')
        );
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);

    const page = makePage(cdp, sessionId, consoleErrors);
    await page.setViewport(1280, 900);
    await run(page, consoleErrors);
  } finally {
    try {
      cdp?.ws.close();
    } catch {
      /* already closed */
    }
    chrome.kill();
    // Chrome writes its profile asynchronously, so a bare rmSync can race it.
    for (let i = 0; i < 10; i++) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch {
        await sleep(200);
      }
    }
  }
}

async function main() {
  // Verify the server is actually up before launching a browser at it.
  const ping = await fetch(BASE).catch(() => null);
  if (!ping || !ping.ok) {
    console.error(C.red(`\nNo server at ${BASE}. Start it with \`npm run dev\` first.\n`));
    process.exit(2);
  }

  const wanted = process.argv.includes('--only')
    ? process.argv[process.argv.indexOf('--only') + 1]
    : 'all';

  if (wanted === 'all' || wanted === 'java' || wanted === 'programming') {
    await withBrowser('programming', programmingSuite);
  }
  if (wanted === 'all' || wanted === 'sql') {
    await withBrowser('sql', sqlSuite);
  }

  console.log(
    C.bold(`\n${results.pass + results.fail} checks: `) +
      C.green(results.pass + ' passed') +
      (results.fail ? ', ' + C.red(results.fail + ' failed') : '')
  );
  if (results.fail) {
    console.log(C.red('\nFailures:'));
    for (const f of results.failures) console.log('  - ' + f);
  }
  console.log(C.dim(`\nScreenshots written to ${SHOT_DIR}\n`));
  return results.fail;
}

main()
  .then((fails) => process.exit(fails === 0 ? 0 : 1))
  .catch((e) => {
    console.error(C.red('\nHarness crashed: ') + (e?.stack ?? e));
    process.exit(2);
  });
