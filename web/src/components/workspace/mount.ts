// The problem workspace island. Wires the editor, the Pyodide runner, the timer, the
// attempt recorder and every pane together. `mountWorkspace` is also what mock rounds
// (and any other parent flow) call to reuse the workspace.
//
// Exam completion contract (modes interview, placement, checkpoint):
//   The workspace never records `passed`, `gave_up` or `left` in these modes. It records
//   `opened`, `test_run` (on Submit) and `hint_revealed`, and after every Run, Submit and
//   hint it reports a `WorkspaceReport` two ways: `opts.onReport(report)`, and a bubbling
//   `myleet:workspace-report` CustomEvent (detail = the report) on the workspace root.
//   The parent decides the outcome (e.g. `trainer.placementDone`, `checkpointDone`, or its
//   own `passed` line for an interview round) from the last report with `event: "submit"`.
//   Practice and drill also emit the report, after the workspace has recorded the attempt.

import { addToHistory, draftHistory, loadSnapshot, opening, saveSnapshot } from "../../lib/editor/drafts";
import { Attempt, isExam } from "../../lib/editor/attempt";
import { chipText, failures, type Failure } from "../../lib/editor/failure";
import { diffLines, sideBySide } from "../../lib/editor/diff";
import { attemptsFor, eventsThrough, outcomeTag } from "../../lib/editor/history";
import { highlightLines } from "../../lib/editor/highlight";
import { actionFor, chordHandler, isMac, keyLabel, SHORTCUTS, type Action } from "../../lib/editor/keymap";
import type { LintReport } from "../../lib/editor/lint";
import { ruffWorker } from "../../lib/editor/ruff-client";
import { prefetchPyodide } from "../../lib/editor/pyodide-progress";
import { loadSettings, saveSettings, type EditorSettings } from "../../lib/editor/settings";
import { createEditor, type CodeEditor } from "../../lib/editor/setup";
import type { Smarts } from "../../lib/editor/smarts";
import {
  elapsedMs,
  formatClock,
  idleTimer,
  pauseTimer,
  restartTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerLabel,
  timerPhase,
  timerSpoken,
  type TimerState,
} from "../../lib/editor/timer";
import { fetchProblem, loadCatalog } from "../../lib/catalog";
import { appendEvent, loadDraft, readEvents, saveDraft, type Draft } from "../../lib/progress";
import { getRunner, PYODIDE_URL, type RunResult } from "../../lib/runner";
import type { TrainerApi } from "../../lib/trainer";
import type { Mode, Plan, ProblemFiles, ProblemMeta, State } from "../../lib/types";
import type { ResultAttempt, ResultExtras } from "../../lib/ui/workspace-personal";
import { signupHref } from "../../lib/access";
import { companyPracticeContext, type PracticeContext } from "../../lib/practice-context";
import { ROUTES } from "../../lib/routes";
import { icon } from "./icons";
import { climb, ladderRung, renderLadder } from "./ladder";
import { setupPanes, type Panes } from "./panes";
import { fetchStatement, leetcodeSlug } from "./statement";
import { agoText, loadCard, renderResults, runningRows, testNames, type CaseRow, type LoadState } from "./tests-view";
import { $, $$, announcer, closePopover, confirmPop, formatDateTime, formatDay, h, popover, toast } from "./ui";

export interface WorkspaceReport {
  problem: string;
  attempt: string | null;
  mode: Mode;
  event: "run" | "submit" | "hint";
  passed: number;
  total: number;
  green: boolean;
  hints: number;
  elapsedMs: number;
  overTarget: boolean;
}

export interface MountOptions {
  mode?: Mode;
  /** Overrides the time target (interview rounds pass the round length). */
  targetSecs?: number;
  onReport?: (r: WorkspaceReport) => void;
  /** Where the back arrow and "Back to Today" go. */
  backHref?: string;
  practiceContext?: PracticeContext;
  /**
   * Personalization hooks (the shared `lib/ui` reason line and "What this changes" renderers
   * plug in here). Without them the workspace writes a plain reason line and pace line.
   */
  renderReason?: (el: HTMLElement, ctx: { problem: string; events: string; trainer: TrainerApi }) => void;
  renderChanges?: (el: HTMLElement, ctx: { problem: string; events: string; trainer: TrainerApi; before: State | undefined; after: State | undefined }) => void;
  /** The plan before an attempt is recorded, so the result sheet can say what changed. */
  snapshot?: (ctx: { problem: string; events: string; trainer: TrainerApi }) => Plan | null;
  /** The personal note, plan change and next problem for the result sheet (practice mode). */
  resultExtras?: (ctx: { problem: string; events: string; trainer: TrainerApi; snapshot: Plan | null; attempt: ResultAttempt }) => Promise<ResultExtras>;
}

interface InitialData {
  meta: ProblemMeta;
  starter: string;
  moduleTitle: string;
  techniqueTitle: string;
}

const MODES: Mode[] = ["practice", "drill", "interview", "placement", "checkpoint"];
const SAVE_DELAY_MS = 400;
const CASES_KEY = (id: string) => `myleet-cases:${id}`;

export async function mountFromPage(personal: Pick<MountOptions, "renderReason" | "renderChanges" | "snapshot" | "resultExtras"> = {}): Promise<void> {
  const root = document.getElementById("workspace");
  if (!root) return;
  const q = new URLSearchParams(location.search);
  const m = q.get("mode") as Mode | null;
  const mode = m && MODES.includes(m) ? m : "practice";
  let context: PracticeContext | null = null;
  if (mode === "practice" && q.get("company")) {
    try {
      const { catalog } = await loadCatalog();
      context = companyPracticeContext(catalog, root.dataset["problem"] ?? "", q.get("company"));
    } catch {
      // The ordinary workspace still opens if the catalog is unavailable.
    }
  }
  const backHref = context?.backHref ?? (mode === "placement" ? ROUTES.diagnostic : (root.dataset["back"] ?? ROUTES.today));
  for (const a of root.querySelectorAll<HTMLAnchorElement>("[data-back]")) a.href = backHref;
  if (context) {
    for (const a of root.querySelectorAll<HTMLAnchorElement>("[data-back]")) {
      a.setAttribute("aria-label", `Back to ${context.title} practice set`);
      a.title = `Back to ${context.title}`;
    }
  }
  void mountWorkspace(root, { mode, backHref, ...personal, ...(context ? { practiceContext: context } : {}) });
}

export async function mountWorkspace(root: HTMLElement, opts: MountOptions = {}): Promise<void> {
  const data = JSON.parse($(document, "#wsx-data").textContent ?? "{}") as InitialData;
  const meta = data.meta;
  const id = meta.id;
  const mode: Mode = opts.mode ?? "practice";
  const exam = isExam(mode);
  const interview = mode === "interview";
  const mac = isMac(navigator.platform || navigator.userAgent);
  const announce = announcer($(root, "[data-live]"));
  const toastSlot = $(root, "[data-toast]");
  const backHref = opts.backHref ?? root.dataset["back"] ?? "/";

  const context = opts.practiceContext;
  if (context) {
    const nav = h("nav", { class: "practice-nav", "aria-label": `${context.title} practice navigation` },
      h("a", { class: "practice-source", href: context.backHref }, `${context.title} set`),
      h("span", { class: "practice-position" }, `${context.position} of ${context.total}`),
      context.previous ? h("a", { class: "btn btn-ghost btn-sm", href: context.previous.href, title: context.previous.title }, "Previous") : h("button", { class: "btn btn-ghost btn-sm", disabled: true }, "Previous"),
      context.next ? h("a", { class: "btn btn-ghost btn-sm", href: context.next.href, title: context.next.title }, "Next") : h("button", { class: "btn btn-ghost btn-sm", disabled: true }, "Next"),
      h("a", { class: "btn btn-ghost btn-sm", href: context.exitHref, "aria-label": "Exit practice and view all companies" }, h("span", { class: "practice-exit-label" }, "All companies"), h("span", { class: "practice-exit-short", "aria-hidden": "true" }, "Exit")),
    );
    root.querySelector(".wbar")?.append(nav);
  }
  root.dataset["mode"] = mode;
  if (mode === "placement") {
    $(root, '[data-act="dontKnow"]').hidden = false;
    for (const a of $$<HTMLAnchorElement>(root, "[data-back]")) a.setAttribute("aria-label", "Back to the diagnostic");
  }
  for (const k of $$(root, "[data-kbd]")) k.textContent = keyLabel(k.dataset["kbd"] ?? "", mac).replace("Ctrl+Enter", "Ctrl ↵").replace("Ctrl+", "Ctrl ");
  if (exam) for (const el of $$(root, "[data-exam-hide]")) el.hidden = true;
  if (interview || !meta.hints.length && !meta.key_idea) for (const el of $$(root, "[data-exam-hide-hints]")) el.hidden = true;
  if (interview) {
    const crumb = $(root, "[data-crumb]");
    crumb.textContent = "Technique hidden until the reveal";
    $(root, "[data-interview-tag]").hidden = false;
  }

  // ---- State ----
  let settings: EditorSettings = loadSettings();
  if (interview) settings = { ...settings, autocomplete: false };
  // Lines always wrap on phones.
  const phoneMq = matchMedia("(max-width: 760px)");
  const effective = (): EditorSettings => ({ ...settings, wrap: settings.wrap || phoneMq.matches });
  let trainer: TrainerApi | null = null;
  let events = "";
  let files: ProblemFiles | null = null;
  let timer: TimerState = idleTimer();
  let targetMs = (opts.targetSecs ?? meta.time_target_secs) * 1000;
  let lastRun: RunResult | null = null;
  let lastFails: Failure[] = [];
  let ranAt = 0;
  let running = false;
  let pythonReady = false;
  let smartsReady = false;
  let unlocked = false;
  let hintsShown = 0;
  let hintConfirming = false;
  let announcedPhase = "";
  let previousDraft: Draft | null = null;
  let lastHistoryAt = 0;
  let programmatic = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let resultOpen = false;
  let vimMode: string | null = null;
  const load: LoadState = { python: "now", pythonPct: 0, mbDone: 0, mbTotal: 12.1, smarts: "wait", lint: "now", error: null };

  const newAttempt = () =>
    new Attempt(id, mode, {
      eventLine: (e) => {
        if (!trainer) throw new Error("trainer not loaded");
        return trainer.eventLine(e);
      },
      newAttemptId: () => trainer?.newAttemptId() ?? Math.random().toString(16).slice(2, 14).padEnd(12, "0"),
      append: async (line) => {
        events = await appendEvent(line);
        return events;
      },
      now: () => Date.now(),
    });
  let attempt = newAttempt();

  // ---- Background loads (never block typing) ----
  const trainerP = import("../../lib/trainer")
    .then((m) => m.loadTrainer())
    .then(async (t) => {
      trainer = t;
      events = await readEvents();
      if (interview && !opts.targetSecs) targetMs = t.interviewRules().round_secs * 1000;
      return t;
    })
    .catch(() => null);
  const filesP = fetchProblem(id)
    .then((f) => (files = f))
    .catch(() => null);
  const runner = getRunner({
    onProgress: (p) => {
      if (p.stage === "pytest") load.pythonPct = Math.max(load.pythonPct, 92);
      if (p.stage === "ready") onPythonReady();
      renderLoad();
    },
  });
  const ruff = ruffWorker();

  // ---- Draft / opening ----
  const draft = await loadDraft(id).catch(() => undefined);
  const states0 = await Promise.race([trainerP.then((t) => (t ? t.states(events) : {})), new Promise<Record<string, State>>((r) => setTimeout(() => r({}), 600))]);
  const st0 = states0[id];
  const review = !exam && !!st0 && st0.rung >= 0 && st0.due_ms !== null && st0.due_ms <= Date.now();
  const open = exam ? { code: data.starter, banner: null } : opening(data.starter, draft, review);
  if (open.banner?.kind === "review" && draft) previousDraft = draft;
  setTag(st0, review);

  // ---- Editor ----
  const smarts: Smarts = {
    ready: () => smartsReady,
    complete: (p) => runner.complete(p),
    hover: (p) => runner.hover(p),
    signatures: (p) => runner.signatures(p),
  };
  const host = $(root, "[data-editor]");
  host.replaceChildren();
  const editor: CodeEditor = createEditor({
    parent: host,
    doc: open.code,
    settings: effective(),
    smarts,
    ruff,
    smartsAllowed: !interview,
    onChange: onEdit,
    onCursor: (line, col) => setStatus("cursor", `Ln ${line}, Col ${col}`),
    onLint,
    onSave: () => void save(),
    onVimMode: (m) => {
      vimMode = m;
      renderVim();
    },
  });
  applyVisualSettings();
  phoneMq.addEventListener("change", () => void editor.applySettings(effective()));
  // Settings changed elsewhere (/settings in another tab, the palette): follow them live.
  window.addEventListener("myleet:prefs", () => {
    settings = { ...loadSettings(), ...(interview ? { autocomplete: false } : {}) };
    void editor.applySettings(effective()).then(renderVim);
    applyVisualSettings();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "myleet-prefs") window.dispatchEvent(new Event("myleet:prefs"));
  });
  root.dataset["state"] = "ready";

  const panes: Panes = setupPanes(root, { focusEditor: () => editor.focus() });
  if (interview && !root.hasAttribute("data-focus")) toggleFocusMode(true);

  // ---- Status bar ----
  function setStatus(key: string, text: string) {
    const el = root.querySelector<HTMLElement>(`[data-st="${key}"]`);
    if (el && key !== "lint" && key !== "tests" && key !== "saved") el.textContent = text;
  }
  function renderVim() {
    const el = $(root, '[data-st="vim"]');
    el.textContent = !settings.vim ? "Vim off" : vimMode === "insert" ? "-- INSERT --" : vimMode === "visual" ? "-- VISUAL --" : "NORMAL";
  }
  function renderRuntime() {
    const el = $(root, '[data-st="runtime"]');
    if (load.python === "err") el.textContent = "Python failed to load";
    else if (!pythonReady) el.textContent = navigator.onLine === false ? "Offline, Python not saved yet" : `Python loading ${Math.round(load.pythonPct)}%`;
    else el.textContent = navigator.onLine === false ? "Offline, cached" : `Python 3.14, Pyodide${load.smarts === "off" ? " · Autocomplete unavailable" : ""}`;
    const label = root.querySelector<HTMLElement>("[data-run-label]");
    if (label) label.textContent = pythonReady || load.python === "err" ? "Run" : `Run (Python ${Math.round(load.pythonPct)}%)`;
  }
  function renderTestsStatus() {
    const dot = $(root, "[data-tests-dot]");
    const text = $(root, "[data-tests-text]");
    const count = lastRun && !lastRun.timedOut && lastRun.total ? `${lastRun.passed}/${lastRun.total}` : "";
    const ok = !!lastRun && lastRun.total > 0 && lastRun.passed === lastRun.total;
    dot.style.background = !lastRun ? "var(--line-strong)" : ok ? "var(--pass-solid)" : "var(--fail-solid)";
    text.textContent = !lastRun ? "Tests not run" : lastRun.timedOut ? "Tests stopped" : count ? `Tests ${count}` : "Tests not run";
    $(root, "[data-tests-count]").textContent = count;
    $(root, "[data-mtests-count]").textContent = count;
    $(root, "[data-rail-count]").textContent = count;
  }
  function onLint(r: LintReport) {
    load.lint = r.failed ? "off" : "ok";
    renderLoad();
    const dot = $(root, "[data-lint-dot]");
    const text = $(root, "[data-lint-text]");
    if (r.failed) {
      text.textContent = "Lint unavailable";
      dot.style.background = "var(--line-strong)";
      return;
    }
    const n = r.diagnostics.length;
    const errors = r.diagnostics.filter((d) => d.code === null || d.code.startsWith("E9") || d.code === "F821").length;
    dot.style.background = n === 0 ? "var(--pass-solid)" : errors ? "var(--fail-solid)" : "var(--due-solid)";
    if (!n) {
      text.textContent = "No problems";
      return;
    }
    const first = r.diagnostics[0]!;
    const kind = errors ? (errors === 1 && n === 1 ? "1 error" : `${n} problems`) : n === 1 ? "1 warning" : `${n} warnings`;
    text.innerHTML = "";
    text.append(`${kind}: ${first.code ? `${first.code} ` : ""}`);
    first.message.split(/`([^`]+)`/).forEach((part, i) => text.append(i % 2 ? h("code", {}, part) : part));
  }
  function setSaved(state: "saved" | "saving" | "formatted" | "error") {
    const head = $(root, "[data-saved]");
    const st = $(root, "[data-saved-text]");
    const txt = state === "saved" ? "Draft saved" : state === "saving" ? "Saving draft" : state === "formatted" ? "Formatted" : "Couldn't save the draft";
    head.textContent = txt;
    head.title = "Drafts are saved on this device";
    st.textContent = state === "saved" ? "Saved" : state === "saving" ? "Saving" : state === "formatted" ? "Formatted" : "Not saved";
  }
  setSaved("saved");
  renderVim();
  $(root, '[data-st="spaces"]').textContent = `Spaces: ${settings.tabSize}`;

  // ---- Draft bar ----
  const bar = $(root, "[data-draft-bar]");
  if (open.banner?.kind === "draft") {
    const saved = open.banner.savedAt;
    bar.hidden = false;
    bar.append(
      h("span", {}, `Draft from ${formatDateTime(saved)}`),
      h(
        "button",
        {
          class: "btn btn-ghost btn-sm",
          onclick: () => {
            const prev = editor.code();
            setCode(data.starter);
            bar.hidden = true;
            toast(toastSlot, "Started fresh from the starter code", () => setCode(prev));
          },
        },
        "Start fresh",
      ),
    );
  } else if (open.banner?.kind === "review") {
    bar.hidden = false;
    bar.append(
      h("span", {}, "A review opens fresh, so it's a cold redo. Your last draft is in History"),
      h("button", { class: "btn btn-ghost btn-sm", onclick: () => showLeftTab("history") }, "Open History"),
    );
  }

  // ---- Editing, autosave, timer start ----
  function setCode(code: string) {
    programmatic = true;
    editor.setCode(code);
    programmatic = false;
  }
  function onEdit(code: string) {
    if (!programmatic) {
      if (attempt.end) {
        attempt = newAttempt();
        timer = idleTimer();
        hintsShown = 0;
        unlocked = false;
        renderHints();
        renderSolution();
      }
      if (timer.startedAt === null && !root.hasAttribute("data-paused")) {
        timer = startTimer(timer, Date.now());
        void attempt.open().catch(() => {});
        tick();
      }
      bar.hidden = true;
    }
    if (exam) return;
    setSaved("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushDraft(code), SAVE_DELAY_MS);
  }
  async function flushDraft(code = editor.code()) {
    clearTimeout(saveTimer);
    try {
      await saveDraft(id, code);
      setSaved("saved");
      if (Date.now() - lastHistoryAt > 120_000) {
        lastHistoryAt = Date.now();
        await addToHistory(id, code);
      }
      return true;
    } catch {
      setSaved("error");
      return false;
    }
  }

  async function save() {
    if (settings.formatOnSave) {
      const ok = await editor.format();
      if (ok) setSaved("formatted");
    }
    await flushDraft();
    if (!settings.formatOnSave) setSaved("saved");
    if (settings.runOnSave) void run(false);
  }

  // ---- Timer ----
  const timerEl = $(root, "[data-timer]");
  const clockEl = $(root, "[data-clock]");
  const labelEl = $(root, "[data-target-label]");
  const trackEl = $(root, "[data-track]");
  function tick() {
    const now = Date.now();
    const e = elapsedMs(timer, now);
    const phase = timerPhase(timer, now, targetMs);
    timerEl.dataset["state"] = phase;
    const clock = formatClock(e);
    if (clockEl.textContent !== clock) clockEl.textContent = clock;
    labelEl.textContent = timerLabel(timer, now, targetMs);
    trackEl.style.width = `${Math.min(100, (e / targetMs) * 100)}%`;
    timerEl.setAttribute("aria-label", timer.startedAt === null ? `Timer starts when you type, ${Math.round(targetMs / 60_000)} minute target` : timerSpoken(e, targetMs));
    if ((phase === "near" || phase === "over") && announcedPhase !== phase && timer.stoppedMs === null) {
      announcedPhase = phase;
      announce(phase === "near" ? `${labelEl.textContent}` : `Past the target: ${labelEl.textContent}. Nothing stops you`);
    }
    for (const a of $$(root, "[data-ago]")) a.textContent = a.textContent?.replace(/^(just now|ran \d+ (s|min) ago)/, agoText(Number(a.dataset["ago"]), now)) ?? "";
  }
  tick();
  setInterval(tick, 250);

  function togglePause() {
    if (exam || attempt.end) return;
    const now = Date.now();
    const veil = $(root, "[data-veil]");
    if (timer.pausedAt === null) {
      if (timer.startedAt === null) {
        toast(toastSlot, "The timer starts when you type, so there's nothing to pause yet");
        return;
      }
      timer = pauseTimer(timer, now);
      root.setAttribute("data-paused", "");
      veil.hidden = false;
      $(veil, "[data-veil-title]").textContent = `Paused at ${formatClock(elapsedMs(timer, now))}`;
      editor.setReadOnly(true);
      $<HTMLButtonElement>(veil, "button").focus();
      announce(`Timer paused at ${formatClock(elapsedMs(timer, now))}`);
    } else {
      timer = resumeTimer(timer, now);
      root.removeAttribute("data-paused");
      veil.hidden = true;
      editor.setReadOnly(false);
      editor.focus();
      announce("Timer resumed");
    }
    $(root, '.wbar [data-act="pause"]').innerHTML = icon(timer.pausedAt === null ? "pause" : "play");
    $(root, '.wbar [data-act="pause"]').setAttribute("aria-label", timer.pausedAt === null ? "Pause timer (Ctrl .)" : "Resume timer (Ctrl .)");
    tick();
  }

  // ---- Python loading ----
  const testsPanel = $(root, "[data-tests]");
  function renderLoad() {
    renderRuntime();
    if (lastRun || running) return;
    if (pythonReady && load.smarts !== "now") {
      if (!testsPanel.querySelector(".empty-note")) {
        testsPanel.replaceChildren(
          h("p", { class: "empty-note" }, "Run the tests with ", h("kbd", {}, keyLabel("⌘↵", mac)), ". Nothing is recorded until you Submit"),
        );
      }
      return;
    }
    testsPanel.replaceChildren(
      loadCard(load, () => {
        load.python = "now";
        load.error = null;
        renderLoad();
        startPython();
      }),
    );
  }
  function startPython() {
    void prefetchPyodide(PYODIDE_URL, (done, total) => {
      load.mbDone = done / 1e6;
      load.mbTotal = total / 1e6;
      load.pythonPct = Math.min(90, (done / total) * 90);
      renderLoad();
    });
    runner.load().catch((e: unknown) => {
      load.python = "err";
      load.error = e instanceof Error ? e.message.slice(0, 80) : null;
      renderLoad();
    });
  }
  function onPythonReady() {
    if (pythonReady) return;
    pythonReady = true;
    load.python = "ok";
    load.pythonPct = 100;
    load.smarts = interview ? "off" : "wait";
    renderLoad();
    if (interview) return;
    // Warm jedi once the worker is idle (after the first run, or 6 s), so it never delays a run.
    const warm = () => {
      if (warmed) return;
      warmed = true;
      warmJedi();
    };
    warmSoon = warm;
    setTimeout(() => (running ? (warmSoon = warm) : warm()), 6000);
  }
  let warmed = false;
  let warmSoon: (() => void) | null = null;
  function warmJedi() {
    load.smarts = "now";
    renderLoad();
    runner
      .complete({ code: "import collections\ncollections", line: 2, col: 12 })
      .then(() => {
        smartsReady = true;
        load.smarts = "ok";
      })
      .catch(() => {
        load.smarts = "off";
      })
      .finally(renderLoad);
  }
  startPython();
  renderLoad();
  renderTestsStatus();

  // ---- Run and Submit ----
  const runBtns = $$<HTMLButtonElement>(root, '[data-act="run"]');
  function setRunning(on: boolean) {
    running = on;
    if (!on && warmSoon) {
      const w = warmSoon;
      warmSoon = null;
      setTimeout(w, 300);
    }
    for (const b of runBtns) b.toggleAttribute("data-busy", on);
    $$<HTMLButtonElement>(root, '[data-act="submit"]').forEach((b) => (b.disabled = on));
  }

  async function execute(code: string): Promise<RunResult | null> {
    const f = files ?? (await filesP);
    if (!f) {
      testsPanel.replaceChildren(h("div", { class: "tsum bad", role: "alert" }, h("span", { class: "big" }, "Couldn't load this problem's tests"), h("span", { class: "muted" }, "Check your connection and try again")));
      return null;
    }
    testsPanel.replaceChildren(runningRows(testNames(f.test)));
    try {
      return await runner.run({ test: f.test, code });
    } catch (e) {
      if (e instanceof Error && e.message === "runner restarted") return null;
      load.python = "err";
      load.error = e instanceof Error ? e.message.slice(0, 80) : null;
      lastRun = null;
      renderLoad();
      return null;
    }
  }

  function showResults(r: RunResult, code: string, cases: CaseRow[], submit: boolean) {
    lastRun = r;
    ranAt = Date.now();
    lastFails = failures(r, code);
    editor.setFailures(lastFails.filter((f) => f.line !== null).map((f) => ({ line: f.line!, chip: chipText(f) })));
    const green = r.total > 0 && r.passed === r.total;
    testsPanel.replaceChildren(
      renderResults(r, lastFails, {
        ranAt,
        submit,
        cases,
        allPass: green,
        onJump: (line) => editor.jumpTo(line),
        onNext: () => cycleProblem(1),
      }),
    );
    $(root, "[data-console]").textContent = r.output.trim() || "Nothing printed";
    renderTestsStatus();
    showTestsTab("tests");
    if (green && submit) void import("../../lib/first-solve").then((m) => m.firstSolvePrompt());
    const failing = r.tests.filter((t) => t.outcome !== "passed").map((t) => t.name);
    announce(r.timedOut ? "Stopped after the time limit. Python was restarted" : green ? `All ${r.total} passed` : `${r.passed} of ${r.total} passed. Failing: ${failing.slice(0, 3).join(", ")}`);
  }

  async function run(submit: boolean) {
    if (running) {
      // A second press cancels: Python is restarted.
      runner.dispose();
      setRunning(false);
      lastRun = null;
      testsPanel.replaceChildren(h("p", { class: "empty-note" }, "Run cancelled. Python is restarting"));
      startPython();
      return;
    }
    if (root.hasAttribute("data-paused")) return;
    closeResult();
    const code = editor.code();
    setRunning(true);
    if (!submit && (panes.isPhone() || (!panes.isZen() && root.hasAttribute("data-hide-tests")))) panes.revealTests();
    void addToHistory(id, code).catch(() => {});
    const r = await execute(code);
    if (!r) {
      setRunning(false);
      return;
    }
    const cases = submit ? [] : await runCases(code);
    setRunning(false);
    showResults(r, code, cases, submit);
    const green = r.total > 0 && r.passed === r.total;
    if (submit) await finishSubmit(r, code, green);
    else report("run", r);
  }

  function report(event: WorkspaceReport["event"], r: RunResult | null) {
    const e = elapsedMs(timer, Date.now());
    const rep: WorkspaceReport = {
      problem: id,
      attempt: attempt.id,
      mode,
      event,
      passed: r?.passed ?? lastRun?.passed ?? 0,
      total: r?.total ?? lastRun?.total ?? 0,
      green: !!r && r.total > 0 && r.passed === r.total,
      hints: attempt.hints,
      elapsedMs: e,
      overTarget: e >= targetMs,
    };
    opts.onReport?.(rep);
    root.dispatchEvent(new CustomEvent("myleet:workspace-report", { detail: rep, bubbles: true }));
  }

  async function finishSubmit(r: RunResult, code: string, green: boolean) {
    if (!trainer) await trainerP;
    if (!trainer) {
      toast(toastSlot, "Couldn't record this attempt: progress storage didn't load. Your code is saved");
      return;
    }
    const before = trainer.states(events)[id];
    const snapshot = opts.snapshot?.({ problem: id, events, trainer }) ?? null;
    if (exam) {
      await attempt.submit(r.passed, r.total, elapsedMs(timer, Date.now()));
      report("submit", r);
      // The diagnostic picks the next problem from this result.
      if (mode === "placement") location.href = backHref;
      return;
    }
    if (!green) {
      const failing = r.timedOut ? "a run that never finished" : `${r.total - r.passed} failing test${r.total - r.passed === 1 ? "" : "s"}`;
      const ok = await confirmPop(root, $$<HTMLElement>(root, '[data-act="submit"]').find((b) => b.offsetParent) ?? $(root, '.wbar [data-act="submit"]'), {
        title: `Submit with ${failing}?`,
        body: "This counts as a miss: the review drops to 1 day. Keep working and you can still pass",
        ok: "Submit as a miss",
        cancel: "Keep working",
        danger: true,
      });
      if (!ok) {
        report("run", r);
        return;
      }
      await attempt.submitFailing(r.passed, r.total);
    } else {
      await attempt.submit(r.passed, r.total, elapsedMs(timer, Date.now()));
    }
    timer = stopTimer(timer, Date.now());
    tick();
    if (attempt.id) void saveSnapshot(id, attempt.id, code).catch(() => {});
    unlocked = true;
    renderSolution();
    renderHistory();
    report("submit", r);
    const after = trainer.states(events)[id];
    if (!panes.isZen()) panes.toggleTests(false);
    if (panes.isPhone()) panes.showMobile("tests");
    void showResultSheet(before, after, green, snapshot, r);
  }

  async function runCases(code: string): Promise<CaseRow[]> {
    const saved = loadCases();
    if (!saved.length || exam) return [];
    const { customTest, parseSignature, readCases } = await customLib();
    const sig = parseSignature(data.starter);
    if (!sig) return [];
    const test = customTest(sig, saved);
    const mine = readCases(await runner.run({ test, code }), saved.length);
    const ref = files?.solution ? readCases(await runner.run({ test, code: files.solution }), saved.length) : [];
    return saved.map((raws, i) => ({
      input: raws.join(", "),
      mine: mine[i]?.value ?? null,
      ref: ref[i]?.value ?? null,
      error: mine[i]?.error ?? null,
    }));
  }

  // ---- Result sheet ----
  const resultSlot = $(root, "[data-result]");
  const tickPane = $(root, ".tests-pane");
  function closeResult(restoreFocus = false) {
    if (!resultOpen) return;
    resultOpen = false;
    const el = resultSlot.firstElementChild as HTMLElement | null;
    tickPane.classList.remove("all-pass");
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) el.remove();
    else {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 240);
    }
    if (restoreFocus) editor.focus();
  }

  function nextHref(): string {
    if (context) return context.next?.href ?? context.backHref;
    if (!trainer) return backHref;
    try {
      const next = trainer.today(events).find((e) => e.problem !== id);
      return next ? `/p/${encodeURIComponent(next.problem)}` : backHref;
    } catch {
      return backHref;
    }
  }

  /** Copies the code and opens the problem; the learner pastes and submits themselves. No LeetCode login is ever read or stored. */
  function submitOnLeetcode() {
    const code = editor.code();
    // The page opens first so the click still counts as the user's gesture.
    window.open(meta.url, "_blank", "noopener");
    void navigator.clipboard
      ?.writeText(code)
      .then(() => toast(toastSlot, "Your code is copied, so paste it and submit on LeetCode"))
      .catch(() => toast(toastSlot, "Couldn't copy your code. Select it in the editor and copy it by hand"));
  }

  async function showResultSheet(before: State | undefined, after: State | undefined, green: boolean, snapshot: Plan | null, r: RunResult) {
    const from = ladderRung(before?.rung ?? -1);
    const to = ladderRung(after?.rung ?? -1);
    const elapsed = elapsedMs(timer, Date.now());
    const over = elapsed >= targetMs;
    const clock = formatClock(elapsed);
    const dueText = after?.due_ms ? formatDay(after.due_ms) : null;
    const days = [1, 3, 7, 14, 30][Math.max(0, to - 1)] ?? 1;
    const rungName = `${days}-day rung`;
    let title: string;
    let body: string;
    const fell = to < from || (to === 1 && from > 1);
    if (!green) {
      title = "Counted as a miss";
      body = `Back to the 1-day rung, so it comes back ${dueText ? `on ${dueText}` : "tomorrow"}. The reference is unlocked in the Solution tab`;
    } else if (mode === "drill") {
      title = attempt.assisted || over ? "Drill complete" : `Sharp: ${clock}`;
      body = "Drills keep a problem warm without moving its review";
    } else if (attempt.peeks > 0) {
      title = "Passed after a peek";
      body = `Back to the 1-day rung, so it comes back ${dueText ? `on ${dueText}` : "tomorrow"}`;
    } else if (attempt.hints > 0) {
      title = "Passed with a hint";
      body = `Back to the 1-day rung, so it comes back ${dueText ? `on ${dueText}` : "tomorrow"}`;
    } else if (attempt.restarts > 0) {
      title = `Passed after a restart, ${clock}`;
      body = `A restart counts like a hint: back to the 1-day rung, next review ${dueText ?? "tomorrow"}`;
    } else if (over) {
      title = `Passed, ${formatClock(elapsed - targetMs)} over target`;
      body = `Over the ${Math.round(targetMs / 60_000)}-minute target counts like a hint: back to the 1-day rung, next review ${dueText ?? "tomorrow"}`;
    } else if (from === 0) {
      title = `First pass in ${clock}`;
      body = `On the 1-day rung; next review ${dueText ? `on ${dueText}` : "tomorrow"}. Clean passes on later days climb it`;
    } else if (to === from) {
      title = `Clean pass in ${clock}`;
      body = `Same day as your last finish, so the ladder holds at the ${rungName}. Next review on ${dueText ?? "schedule"}`;
    } else {
      title = `Clean pass in ${clock}`;
      body = `No hints, under ${Math.round(targetMs / 60_000)} minutes. It climbs to the ${rungName}, so the next review is ${dueText ?? "on schedule"}`;
    }
    const mastered = to >= 4 && from < 4 && green;
    let extras: ResultExtras | null = null;
    if (mode === "practice" && opts.resultExtras && trainer) {
      const kind = !green ? "miss" : attempt.hints > 0 || attempt.peeks > 0 || attempt.restarts > 0 ? "hint" : over ? "over" : "clean";
      const attemptFacts: ResultAttempt = { kind, passed: r.passed, total: r.total, failing: lastFails.map((f) => f.test), reviewDays: green && kind === "clean" ? days : 1, targetMins: Math.round(targetMs / 60_000) };
      // Capped so a slow plan build never delays the sheet.
      extras = await Promise.race([
        opts.resultExtras({ problem: id, events, trainer, snapshot, attempt: attemptFacts }).catch(() => null),
        new Promise<null>((res) => setTimeout(() => res(null), 500)),
      ]);
      if (extras?.next) {
        // Warm the next problem so "Next" opens without a wait.
        void fetchProblem(extras.next.href.replace(/^\/p\//, "").split("?")[0] ?? "").catch(() => {});
        document.head.append(h("link", { rel: "prefetch", href: extras.next.href }));
      }
    }
    // "What this changes" (diagnosis update) mounts here when the shared renderer is present.
    const changes = h("div", { class: "changes", "data-changes": "" });
    if (opts.renderChanges && trainer) opts.renderChanges(changes, { problem: id, events, trainer, before, after });
    const lad = h("span", { class: "ladder" });
    const nx = context ? (context.next ? { ...context.next, reason: `Next in the ${context.title} set` } : null) : extras?.next;
    const end = context ? null : extras?.end;
    const next = end
      ? h("a", { class: "btn btn-primary", href: end.tomorrowHref }, "See tomorrow ", h("kbd", {}, "↵"))
      : nx
        ? h("a", { class: "btn btn-primary", href: nx.href }, h("span", { class: "nx-title" }, `Next: ${nx.title}`), " ", h("kbd", {}, "↵"))
        : h("a", { class: "btn btn-primary", href: nextHref() }, context ? `Back to ${context.title}` : "Next problem ", h("kbd", {}, "↵"));
    const sheet = h(
      "div",
      { class: "result", role: "status", "aria-live": "polite" },
      lad,
      h(
        "div",
        { class: "txt" },
        h("h2", {}, title, mastered ? h("span", { class: "tag tag-pass mtag" }, "Mastered") : null),
        h("p", {}, extras?.note ?? body),
        extras?.change ? h("p", { class: "adapt" }, extras.change) : null,
        changes,
        end ? h("p", { class: "endnote" }, end.text) : null,
      ),
      h(
        "div",
        { class: "acts" },
        next,
        end?.extra ? h("a", { class: "btn btn-secondary", href: end.extra.href }, `One more: ${end.extra.title}`) : null,
        nx ? h("p", { class: "nextwhy" }, nx.reason) : null,
        extras?.guest ? h("a", { class: "nextwhy guest-link", href: signupHref() }, "Create a free account to get a plan built around this") : null,
        files?.solution ? h("button", { class: "btn btn-secondary", onclick: () => (closeResult(), showSolution("diff")) }, "Compare with reference") : null,
        green && mode !== "drill" && leetcodeSlug(meta.url) ? h("button", { class: "btn btn-ghost", type: "button", "data-submit-lc": "", onclick: submitOnLeetcode }, "Submit on LeetCode too") : null,
      ),
      h("button", { class: "icon-btn x", "aria-label": "Dismiss (Esc)", html: icon("x"), onclick: () => closeResult(true) }),
    );
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (green) tickPane.classList.add("all-pass");
    const show = () => {
      resultSlot.replaceChildren(sheet);
      resultOpen = true;
      if (fell && green) renderLadder(lad, { rung: to, size: "lg", fell: from });
      else if (!green) renderLadder(lad, { rung: to, size: "lg", fell: from > 1 ? from : 0 });
      else if (mode === "drill") renderLadder(lad, { rung: to, size: "lg" });
      else setTimeout(() => climb(lad, from, to, { size: "lg" }), reduce ? 0 : 560);
      lad.setAttribute("aria-label", `${title}. ${extras?.note ?? body}`);
      next.focus({ preventScroll: true });
    };
    show();
    announce(`${title}. ${extras?.note ?? body}`);
  }

  // ---- Left pane: tabs, statement, hints, solution, history ----
  const leftTabs = $$<HTMLButtonElement>(root, "[data-ltab]");
  function showLeftTab(name: string) {
    for (const t of leftTabs) {
      const on = t.dataset["ltab"] === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !on;
    }
    if (name === "history") renderHistory();
    if (name === "solution") renderSolution();
    panes.revealProblem();
  }
  tabKeys(leftTabs, (t) => showLeftTab(t.dataset["ltab"] ?? "problem"));

  const testTabs = $$<HTMLButtonElement>(root, "[data-ttab]");
  function showTestsTab(name: string) {
    for (const t of testTabs) {
      const on = t.dataset["ttab"] === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls") ?? "");
      if (panel) panel.hidden = !on;
    }
    if (name === "custom") void renderCustom();
  }
  tabKeys(testTabs, (t) => showTestsTab(t.dataset["ttab"] ?? "tests"));

  function tabKeys(tabs: HTMLButtonElement[], select: (t: HTMLButtonElement) => void) {
    for (const t of tabs) {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const vis = tabs.filter((x) => !x.hidden);
        const i = vis.indexOf(t);
        let n: HTMLButtonElement | undefined;
        if (e.key === "ArrowRight") n = vis[(i + 1) % vis.length];
        if (e.key === "ArrowLeft") n = vis[(i - 1 + vis.length) % vis.length];
        if (e.key === "Home") n = vis[0];
        if (e.key === "End") n = vis[vis.length - 1];
        if (n) {
          e.preventDefault();
          select(n);
          n.focus();
        }
      });
    }
  }

  // Statement from LeetCode through the Worker when the problem has no prompt of its own.
  const stmt = $(root, "[data-statement]");
  async function loadStatement() {
    if (stmt.hasAttribute("data-has-prompt")) return;
    const slug = leetcodeSlug(meta.url);
    const lc = h("a", { class: "btn btn-secondary btn-sm", href: meta.url, target: "_blank", rel: "noopener" }, "Open on LeetCode ", h("span", { html: icon("external-link", 14, "icon-sm") }));
    if (!slug) {
      stmt.replaceChildren(h("div", { class: "stmt-note" }, "This problem's statement lives on LeetCode", h("div", { class: "row" }, lc)));
      return;
    }
    const res = await fetchStatement(slug);
    if (res.kind === "ok") {
      stmt.innerHTML = res.html;
      return;
    }
    const msg =
      res.kind === "premium"
        ? "This is a LeetCode Premium problem, so its statement can't be shown here. The tests and the editor work as usual"
        : res.kind === "none"
          ? "LeetCode has no statement for this problem. The tests and the editor work as usual"
          : "Couldn't load the statement (it comes from LeetCode through our server). The editor and tests still work";
    const retry = h("button", { class: "btn btn-ghost btn-sm", onclick: () => (stmt.replaceChildren(h("div", { class: "stmt-skel", role: "status", "aria-label": "Loading the statement" }, h("span", { class: "skel" }), h("span", { class: "skel" }))), void loadStatement()) }, "Retry");
    stmt.replaceChildren(h("div", { class: "stmt-note" }, msg, h("div", { class: "row" }, lc, res.kind === "premium" || res.kind === "none" ? null : retry)));
  }
  void loadStatement();

  // Hints, then the key idea last. Opening the first records the attempt as assisted.
  const hintItems = [
    ...meta.hints.map((text, i) => ({ label: `Hint ${i + 1}`, sub: "", text, key: false })),
    ...(meta.key_idea && !exam ? [{ label: "Key idea", sub: "last, shows the pattern", text: meta.key_idea, key: true }] : []),
  ];
  function renderHints() {
    $(root, "[data-hint-count]").textContent = `${hintsShown}/${hintItems.length}`;
    for (const box of $$(root, "[data-hints]")) {
      const nodes: HTMLElement[] = [];
      hintItems.forEach((it, i) => {
        if (i < hintsShown) {
          nodes.push(h("div", { class: "hint-open", role: "note", "data-hint-open": i }, h("strong", {}, it.label), it.text));
          return;
        }
        const next = i === hintsShown;
        nodes.push(
          h(
            "div",
            { class: "hint-item" },
            h("span", { html: icon(it.key ? "key-round" : "lightbulb") }),
            h("span", {}, it.label, it.sub ? h("span", { class: "sub" }, ` ${it.sub}`) : null),
            h(
              "button",
              { class: "btn btn-ghost btn-sm", disabled: !next || hintConfirming, onclick: () => revealHint() },
              "Show",
              next ? h("kbd", {}, keyLabel("⌘H", mac)) : null,
            ),
          ),
        );
        if (next && hintConfirming) {
          const cancel = h("button", { class: "btn btn-ghost btn-sm", onclick: () => ((hintConfirming = false), renderHints()) }, "Not yet");
          nodes.push(
            h(
              "div",
              { class: "hint-confirm", role: "alertdialog", "aria-label": "Open a hint?" },
              h("span", {}, "Open it? This attempt becomes assisted: the review drops to 1 day"),
              h("div", { class: "acts" }, cancel, h("button", { class: "btn btn-primary btn-sm", "data-hint-ok": "", onclick: () => revealHint(true) }, `Show ${it.label.toLowerCase()}`)),
            ),
          );
        }
      });
      if (!hintItems.length) nodes.push(h("p", { class: "cost" }, "No hints for this problem"));
      box.replaceChildren(...nodes);
    }
  }
  async function revealHint(confirmed = false) {
    if (interview || hintsShown >= hintItems.length) return;
    const visibleBox = () => $$(root, "[data-hints]").find((b) => b.offsetParent !== null);
    if (hintsShown === 0 && attempt.hints === 0 && !confirmed && !attempt.end) {
      hintConfirming = true;
      panes.revealProblem();
      if (!visibleBox()) showLeftTab("hints");
      renderHints();
      visibleBox()?.querySelector<HTMLElement>("[data-hint-ok]")?.focus();
      visibleBox()?.querySelector("[data-hint-ok]")?.scrollIntoView({ block: "nearest" });
      return;
    }
    hintConfirming = false;
    hintsShown++;
    renderHints();
    panes.revealProblem();
    if (!visibleBox()) showLeftTab("hints");
    visibleBox()?.querySelector(`[data-hint-open="${hintsShown - 1}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    announce(`${hintItems[hintsShown - 1]?.label}: ${hintItems[hintsShown - 1]?.text}`);
    await attempt.hint().catch(() => {});
    report("hint", null);
  }
  renderHints();

  // Say it aloud: each tick is recorded once per attempt.
  for (const box of $$<HTMLInputElement>(root, "[data-say]")) {
    box.addEventListener("change", () => {
      if (box.checked) void attempt.sayAloud(box.dataset["say"] ?? "").catch(() => {});
    });
  }

  // Solution: locked until a pass, a give-up or a confirmed peek.
  const solPanel = $(root, "[data-solution]");
  let solView: "ref" | "diff" = "ref";
  function renderSolution() {
    const lockIcon = root.querySelector<HTMLElement>("[data-lock]");
    if (lockIcon) lockIcon.hidden = unlocked;
    if (exam) return;
    if (!meta.has_solution && !files?.solution) {
      solPanel.replaceChildren(h("div", { class: "locked" }, h("h2", {}, "No reference solution yet"), h("p", {}, "This problem has no reference in the curriculum. Compare with your earlier attempts in History")));
      return;
    }
    if (!unlocked) {
      const peek = h("button", { class: "btn btn-quiet-danger btn-sm" }, "Peek at the solution");
      peek.addEventListener("click", async () => {
        const ok = await confirmPop(root, peek, {
          title: "Peek at the solution?",
          body: "Peeking drops this review to 1 day. You can still pass the tests afterwards",
          ok: "Peek",
          cancel: "Keep going",
          danger: true,
        });
        if (!ok) return;
        await attempt.peek().catch(() => {});
        unlocked = true;
        renderSolution();
      });
      solPanel.replaceChildren(
        h(
          "div",
          { class: "locked" },
          h("h2", {}, "The solution opens when you're done"),
          h("p", {}, "It unlocks after you pass with Submit or give up. Peeking before then records this attempt as assisted: the review drops to 1 day"),
          h("div", { class: "acts" }, peek),
        ),
      );
      return;
    }
    const ref = files?.solution ?? "";
    const seg = h(
      "div",
      { class: "seg", role: "group", "aria-label": "Solution view" },
      h("button", { "aria-pressed": String(solView === "ref"), onclick: () => ((solView = "ref"), renderSolution()) }, "Reference"),
      h("button", { "aria-pressed": String(solView === "diff"), onclick: () => ((solView = "diff"), renderSolution()) }, "Diff with yours"),
    );
    const body = solView === "ref" ? codeView(ref) : diffView(editor.code(), ref, "Your code", "Reference");
    solPanel.replaceChildren(h("div", { class: "sol-head" }, h("span", {}, solView === "ref" ? "Reference solution, read-only" : "Your code against the reference"), seg), body);
  }
  function showSolution(view: "ref" | "diff") {
    solView = view;
    showLeftTab("solution");
  }

  function codeView(code: string): HTMLElement {
    return h(
      "pre",
      { class: "codeview", tabindex: "0", "aria-label": "Reference solution" },
      highlightLines(code).map((l, i) => h("div", { class: "cl" }, h("span", { class: "ln", "aria-hidden": "true" }, String(i + 1)), h("code", { html: l || " " }))),
    );
  }
  function diffView(a: string, b: string, la: string, lb: string): HTMLElement {
    const ops = diffLines(a, b);
    if (panes.isPhone()) {
      return h(
        "div",
        { class: "diff1", "aria-label": `${la} compared with ${lb}` },
        ops.map((o) => h("div", { class: `l ${o.kind === "same" ? "" : o.kind}` }, o.text || " ")),
      );
    }
    const rows = sideBySide(ops);
    return h(
      "div",
      { class: "diff2", "aria-label": `${la} compared with ${lb}` },
      h("div", { class: "side" }, h("h3", {}, la), rows.map((r) => h("div", { class: `l ${r.left ? (r.left.kind === "del" ? "del" : "") : "gap"}` }, r.left?.text || " "))),
      h("div", { class: "side" }, h("h3", {}, lb), rows.map((r) => h("div", { class: `l ${r.right ? (r.right.kind === "add" ? "add" : "") : "gap"}` }, r.right?.text || " "))),
    );
  }

  // History: past attempts with the ladder after each and a diff.
  const histPanel = $(root, "[data-history]");
  function renderHistory() {
    if (histPanel.hidden && !histPanel.dataset["force"]) return;
    const list = attemptsFor(events, id);
    const items: HTMLElement[] = [];
    if (previousDraft) {
      const d = previousDraft;
      items.push(
        h(
          "li",
          { class: "hrow" },
          h("div", {}, h("div", { class: "title" }, `Draft from ${formatDateTime(d.savedAt)}`), h("div", { class: "sub" }, h("span", { class: "tag tag-progress" }, "Last draft"), "kept when this review opened fresh")),
          h("span", {}),
          h(
            "div",
            {},
            h("button", { class: "btn btn-ghost btn-sm", onclick: () => openDiff(d.code, "Last draft", null) }, "Diff"),
            h(
              "button",
              {
                class: "btn btn-ghost btn-sm",
                onclick: () => {
                  const prev = editor.code();
                  setCode(d.code);
                  toast(toastSlot, "Restored your last draft", () => setCode(prev));
                },
              },
              "Restore",
            ),
          ),
        ),
      );
    }
    const statesAfter = (a: (typeof list)[number]) => {
      try {
        return trainer?.states(eventsThrough(events, a))[id];
      } catch {
        return undefined;
      }
    };
    list.forEach((a, i) => {
      const tag = outcomeTag(a, targetMs);
      const st = a.outcome === "open" ? undefined : statesAfter(a);
      const lad = h("span", { class: "ladder-cell" });
      if (st) renderLadder(lad, { rung: ladderRung(st.rung) });
      const prevAttempt = list[i + 1];
      const effect = a.outcome === "passed" && st ? (tag.tone === "pass" ? `on the ${[1, 3, 7, 14, 30][st.rung] ?? 1}-day rung` : "back to 1 day") : a.outcome === "gave_up" || a.outcome === "missed" ? "back to 1 day" : a.outcome === "open" ? "in progress" : "";
      const diffBtn = h("button", { class: "btn btn-ghost btn-sm" }, "Diff");
      diffBtn.addEventListener("click", async () => {
        const snap = await loadSnapshot(id, a.id);
        const prev = prevAttempt ? await loadSnapshot(id, prevAttempt.id) : undefined;
        if (!snap) {
          toast(toastSlot, "No code was saved with this attempt");
          return;
        }
        openDiff(snap.code, `Attempt, ${formatDateTime(a.start)}`, prev ? { code: prev.code, label: `Previous attempt, ${formatDay(prevAttempt!.start)}` } : null);
      });
      items.push(
        h(
          "li",
          { class: "hrow" },
          h(
            "div",
            {},
            h("div", { class: "title" }, formatDateTime(a.start)),
            h("div", { class: "sub" }, h("span", { class: `tag tag-${tag.tone}` }, tag.text), [a.elapsedMs !== null ? formatClock(a.elapsedMs) : null, effect].filter(Boolean).join(", "), a.mode !== "practice" ? ` · ${a.mode}` : ""),
          ),
          lad,
          a.outcome === "open" && a.id === attempt.id ? h("span", {}) : diffBtn,
        ),
      );
    });
    if (!items.length) {
      histPanel.replaceChildren(h("p", { class: "empty-hist" }, "No attempts yet. Submit records one; Run never does. Each attempt keeps its code here so you can diff it later"));
      return;
    }
    histPanel.replaceChildren(h("ol", { class: "hist", "aria-label": "Attempts" }, items));
  }
  function openDiff(code: string, label: string, prev: { code: string; label: string } | null) {
    let against: "prev" | "ref" = prev ? "prev" : "ref";
    const draw = () => {
      const other = against === "prev" && prev ? prev : { code: files?.solution ?? "", label: "Reference" };
      // The earlier attempt sits on the left, so this attempt's changes read as additions.
      const [lc, ll, rc, rl] = against === "prev" ? [other.code, other.label, code, label] : [code, label, other.code, other.label];
      const canRef = !!files?.solution && (unlocked || exam === false && attempt.end !== null);
      const seg = h(
        "div",
        { class: "seg", role: "group", "aria-label": "Compare with" },
        prev ? h("button", { "aria-pressed": String(against === "prev"), onclick: () => ((against = "prev"), draw()) }, "Previous") : null,
        canRef ? h("button", { "aria-pressed": String(against === "ref"), onclick: () => ((against = "ref"), draw()) }, "Reference") : null,
      );
      const body =
        against === "ref" && !canRef
          ? h("p", { class: "empty-hist" }, prev ? "" : "The reference unlocks after you pass or give up. Diff against a previous attempt instead")
          : diffView(lc, ll, rc, rl);
      histPanel.replaceChildren(
        h("div", { class: "back-row" }, h("button", { class: "btn btn-ghost btn-sm", onclick: () => renderHistory() }, "All attempts"), seg),
        body,
      );
    };
    draw();
  }

  // ---- Custom input ----
  const customPanel = $(root, "[data-custom]");
  let customValues: string[] | null = null;
  let customOut: HTMLElement | null = null;
  // Custom input loads on first use: it isn't needed to start typing.
  const customLib = () => import("../../lib/editor/custom");
  function loadCases(): string[][] {
    try {
      return JSON.parse(localStorage.getItem(CASES_KEY(id)) ?? "[]") as string[][];
    } catch {
      return [];
    }
  }
  function saveCases(c: string[][]) {
    try {
      localStorage.setItem(CASES_KEY(id), JSON.stringify(c.slice(-20)));
    } catch {
      // Storage refused: cases live for this visit only.
    }
  }
  async function renderCustom() {
    if (customPanel.childElementCount && customValues) return;
    const { checkInput, parseSignature, placeholderFor, supported } = await customLib();
    const sig = parseSignature(data.starter);
    if (!sig || !supported(sig)) {
      customPanel.replaceChildren(h("p", { class: "empty-note" }, "Custom input isn't available for this problem's argument types yet. The tests cover it"));
      return;
    }
    const params = sig.kind === "class" ? [{ name: "calls", type: "" }] : sig.params;
    customValues ??= params.map((p) => (sig.kind === "class" ? `["${sig.name}"], ["method", 1]` : placeholderFor(p.type)));
    const errs: (string | null)[] = params.map(() => null);
    const runBtn = h("button", { class: "btn btn-secondary btn-sm", onclick: () => void runCustom() }, "Run input", h("kbd", {}, keyLabel("⌘↵", mac)));
    const fields = params.map((p, i) => {
      const fid = `ci-${p.name}`;
      const err = h("p", { class: "err", id: `${fid}-err`, hidden: true });
      const input = h("input", {
        id: fid,
        class: "input mono",
        value: customValues![i] ?? "",
        spellcheck: "false",
        autocomplete: "off",
        autocapitalize: "off",
        "data-custom-field": "",
        "aria-describedby": `${fid}-err`,
      }) as HTMLInputElement;
      input.addEventListener("input", () => {
        customValues![i] = input.value;
        const msg = sig.kind === "class" ? (input.value.trim() ? null : "Enter calls like [\"put\", 1, 1], [\"get\", 1]") : checkInput(input.value.trim(), p.type);
        errs[i] = msg;
        err.textContent = msg ?? "";
        err.hidden = !msg;
        input.setAttribute("aria-invalid", String(!!msg));
        runBtn.disabled = errs.some(Boolean);
      });
      return h(
        "div",
        { class: "field" },
        h("label", { for: fid }, h("code", {}, sig.kind === "class" ? `${sig.name} calls` : p.type ? `${p.name}: ${p.type}` : p.name)),
        input,
        sig.kind === "class" ? h("p", { class: "help" }, `Constructor first, then method calls: ["${sig.name}", 2], ["put", 1, 1], ["get", 1]`) : null,
        err,
      );
    });
    const add = h(
      "button",
      {
        class: "btn btn-ghost btn-sm",
        onclick: () => {
          if (errs.some(Boolean)) return;
          const c = [...loadCases(), [...(customValues ?? [])]];
          saveCases(c);
          renderCaseList();
          toast(toastSlot, "Added to your cases. They re-run with every Run and never count toward Submit");
        },
      },
      "Add as a case",
    );
    const caseList = h("ul", { class: "case-list", "aria-label": "Your cases" });
    const renderCaseList = () => {
      const cs = loadCases();
      caseList.replaceChildren(
        ...cs.map((c, i) =>
          h(
            "li",
            {},
            h("span", { title: c.join(", ") }, c.join(", ")),
            h("button", { class: "icon-btn", "aria-label": "Remove this case", html: icon("x", 14, "icon-sm"), onclick: () => (saveCases(cs.filter((_, j) => j !== i)), renderCaseList()) }),
          ),
        ),
      );
    };
    renderCaseList();
    customOut = h("div", { class: "cout", "aria-live": "polite" }, h("p", { class: "empty-note wide" }, "Your return and the reference's return show here, side by side"));
    customPanel.replaceChildren(h("div", { class: "custom" }, h("div", { class: "fields" }, fields, h("div", { class: "cin-acts" }, runBtn, add), caseList), customOut));
  }
  async function runCustom() {
    await renderCustom();
    const { checkInput, customTest, parseSignature, readCases } = await customLib();
    const sig = parseSignature(data.starter);
    if (!sig || !customValues || !customOut) return;
    const inputs = customValues.map((v) => v.trim());
    if (sig.kind === "function" && sig.params.some((p, i) => checkInput(inputs[i] ?? "", p.type))) return;
    if (running) return;
    const out = customOut;
    out.replaceChildren(h("p", { class: "empty-note wide" }, pythonReady ? "Running your input" : "Running once Python is ready"));
    setRunning(true);
    try {
      const test = customTest(sig, [sig.kind === "class" ? [`[${inputs[0]}]`] : inputs]);
      const mine = readCases(await runner.run({ test, code: editor.code() }), 1)[0];
      const refCode = files?.solution ?? (await filesP)?.solution;
      const ref = refCode ? readCases(await runner.run({ test, code: refCode }), 1)[0] : null;
      const same = !!mine && !!ref && mine.error === null && mine.value === ref.value;
      const ms = mine?.ms !== null && mine?.ms !== undefined ? `${mine.ms < 0.1 ? "under 0.1" : mine.ms < 10 ? mine.ms.toFixed(1) : Math.round(mine.ms)} ms` : "";
      out.replaceChildren(
        ...[
        h("div", {}, h("span", { class: "k" }, "Your return"), h("pre", {}, mine?.error ?? mine?.value ?? "No result")),
        h("div", {}, h("span", { class: "k" }, "Reference returns"), h("pre", {}, ref ? (ref.error ?? ref.value ?? "") : "No reference for this problem")),
        ref
          ? h(
              "p",
              { class: `match ${same ? "ok" : "bad"}` },
              h("span", { html: icon(same ? "check" : "x", 15, "icon-sm") }),
              same
                ? `Same answer${ms ? `, ${ms}` : ""}. Shows the reference's output only, never its code, so it doesn't count as a peek`
                : `Different answers${ms ? `, ${ms}` : ""}. Shows the reference's output only, never its code, so it doesn't count as a peek`,
            )
          : null,
        mine?.printed ? h("div", { class: "wide" }, h("span", { class: "k" }, "Printed"), h("pre", {}, mine.printed)) : null,
      ].filter((n): n is HTMLDivElement | HTMLParagraphElement => n !== null),
      );
      if (mine?.line) editor.setFailures([{ line: mine.line, chip: mine.error ?? "error" }]);
    } catch {
      out.replaceChildren(h("p", { class: "empty-note wide" }, "Couldn't run the input. Python restarted; try again"));
    } finally {
      setRunning(false);
    }
  }

  // ---- Menus: more, settings, drafts ----
  function moreMenu(anchor: HTMLElement) {
    const item = (label: string, ic: Parameters<typeof icon>[0], fn: () => void, o: { danger?: boolean; kbd?: string; hidden?: boolean } = {}) =>
      o.hidden ? null : h("button", { role: "menuitem", class: o.danger ? "danger" : "", onclick: () => (close(), fn()) }, h("span", { html: icon(ic) }), label, o.kbd ? h("kbd", {}, keyLabel(o.kbd, mac)) : null);
    const issue = `https://github.com/kidskoding/myleet/issues/new?title=${encodeURIComponent(`Broken test: ${id}`)}&body=${encodeURIComponent(`Problem: ${id}\n\nWhat the test expects and why it seems wrong:\n`)}`;
    const menu = h(
      "div",
      { class: "menu", role: "menu", "aria-label": "Workspace" },
      item("Pause timer", "pause", togglePause, { kbd: "⌘.", hidden: exam }),
      item("Focus mode", "scan", () => toggleFocusMode(), { kbd: "⌘⇧F" }),
      item("Search and commands", "command", openPalette, { kbd: "⌘K" }),
      item("Restart", "rotate-ccw", () => void restart(), { hidden: exam }),
      item("Give up", "flag", () => void giveUp(anchor), { danger: true, hidden: exam }),
      h("hr", {}),
      item("Editor settings", "settings-2", () => openSettings(anchor)),
      item("Keyboard shortcuts", "keyboard", openShortcuts),
      item(document.fullscreenElement ? "Exit full screen" : "Full screen", "expand", toggleFullscreen),
      h("hr", {}),
      h("a", { role: "menuitem", href: meta.url, target: "_blank", rel: "noopener" }, h("span", { html: icon("external-link") }), "Open on LeetCode"),
      h("a", { role: "menuitem", href: issue, target: "_blank", rel: "noopener" }, h("span", { html: icon("flask-conical") }), "Report a broken test"),
    );
    menu.addEventListener("keydown", (e) => {
      const items = $$<HTMLElement>(menu, '[role="menuitem"]');
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    });
    const close = popover(root, anchor, menu);
  }

  function openSettings(anchor: HTMLElement) {
    const sw = (label: string, key: keyof EditorSettings, disabled = false) => {
      const input = h("input", { type: "checkbox", disabled }) as HTMLInputElement;
      input.checked = !!settings[key];
      input.addEventListener("change", () => updateSettings({ [key]: input.checked }));
      return h("label", { class: "switch" }, input, label);
    };
    const font = h("select", { "aria-label": "Font size" }, [12, 13, 14, 15, 16, 17, 18].map((n) => h("option", { value: n, selected: n === settings.fontSize }, `${n} px`))) as HTMLSelectElement;
    font.addEventListener("change", () => updateSettings({ fontSize: Number(font.value) }));
    const tab = h("select", { "aria-label": "Tab size" }, [2, 4].map((n) => h("option", { value: n, selected: n === settings.tabSize }, `${n} spaces`))) as HTMLSelectElement;
    tab.addEventListener("change", () => updateSettings({ tabSize: Number(tab.value) === 2 ? 2 : 4 }));
    const el = h(
      "div",
      { class: "settings-pop", role: "dialog", "aria-label": "Editor settings" },
      h("h3", {}, "Editor"),
      sw("Vim mode", "vim"),
      sw("Autocomplete and hover docs", "autocomplete", interview),
      sw("Run tests on save", "runOnSave"),
      sw("Format on save", "formatOnSave"),
      sw("Wrap long lines", "wrap"),
      sw("Ligatures", "ligatures"),
      sw("Minimap", "minimap"),
      h("div", { class: "row" }, h("span", {}, "Font size"), font),
      h("div", { class: "row" }, h("span", {}, "Indent"), tab),
    );
    popover(root, anchor, el);
  }

  function updateSettings(patch: Partial<EditorSettings>) {
    settings = { ...settings, ...patch };
    if (!interview) saveSettings(settings);
    void editor.applySettings(effective()).then(renderVim);
    applyVisualSettings();
  }
  function applyVisualSettings() {
    host.style.setProperty("--code-size", `${settings.fontSize}px`);
    root.toggleAttribute("data-noliga", !settings.ligatures);
    $<HTMLInputElement>(root, "[data-run-on-save]").checked = settings.runOnSave;
    $(root, '[data-st="spaces"]').textContent = `Spaces: ${settings.tabSize}`;
  }
  $<HTMLInputElement>(root, "[data-run-on-save]").addEventListener("change", (e) => updateSettings({ runOnSave: (e.target as HTMLInputElement).checked }));

  async function openDrafts(anchor: HTMLElement) {
    const list = await draftHistory(id).catch(() => [] as Draft[]);
    const preview = h("pre", {}, list.length ? "" : "Drafts appear here as you work: one every two minutes, and one each time you run the tests");
    let picked: Draft | null = null;
    const restore = h("button", { class: "btn btn-primary btn-sm", disabled: true }, "Restore");
    const items = list.map((d) => {
      const b = h("button", { "aria-pressed": "false" }, h("span", {}, formatDateTime(d.savedAt)), h("span", {}, `${d.code.split("\n").length} lines`));
      b.addEventListener("click", () => {
        picked = d;
        for (const x of $$(el, "li button")) x.setAttribute("aria-pressed", String(x === b));
        preview.textContent = d.code;
        restore.disabled = false;
      });
      return h("li", {}, b);
    });
    restore.addEventListener("click", () => {
      if (!picked) return;
      const prev = editor.code();
      setCode(picked.code);
      close();
      toast(toastSlot, "Restored that draft", () => setCode(prev));
    });
    const el = h("div", { class: "drafts-pop", role: "dialog", "aria-label": "Earlier drafts" }, h("h3", {}, "Earlier drafts"), list.length ? h("ul", {}, items) : null, preview, h("div", { class: "acts" }, restore));
    const close = popover(root, anchor, el);
  }

  // ---- Restart and give up ----
  async function restart() {
    const anchor = $(root, '.wbar [data-act="more"]');
    const ok = await confirmPop(root, anchor, {
      title: "Restart this attempt?",
      body: "The code goes back to the starter and the timer to zero. A restart counts like a hint for the review",
      ok: "Restart",
      cancel: "Keep going",
    });
    if (!ok) return;
    const prevCode = editor.code();
    const prevTimer = timer;
    await addToHistory(id, prevCode).catch(() => {});
    if (attempt.opened && !attempt.end) await attempt.restart().catch(() => {});
    setCode(data.starter);
    timer = restartTimer();
    announcedPhase = "";
    editor.setFailures([]);
    tick();
    toast(toastSlot, "Restarted from the starter code", () => {
      setCode(prevCode);
      timer = prevTimer;
      tick();
    });
  }

  async function giveUp(anchor: HTMLElement) {
    if (exam || attempt.end) return;
    const ok = await confirmPop(root, anchor, {
      title: "Give up on this attempt?",
      body: "The review drops to 1 day and the reference solution opens. Your draft is kept in History",
      ok: "Give up and see solution",
      cancel: "Keep going",
      danger: true,
    });
    if (!ok) return;
    const code = editor.code();
    await attempt.giveUp().catch(() => {});
    timer = stopTimer(timer, Date.now());
    tick();
    if (attempt.id) await saveSnapshot(id, attempt.id, code).catch(() => {});
    await addToHistory(id, code).catch(() => {});
    unlocked = true;
    showSolution(files?.solution ? "diff" : "ref");
    announce("Gave up. The review drops to 1 day; the reference solution is open");
  }

  // ---- Focus mode, fullscreen ----
  function toggleFocusMode(force?: boolean) {
    const on = force ?? !root.hasAttribute("data-focus");
    root.toggleAttribute("data-focus", on);
    $(root, '.wbar [data-act="focusMode"]').setAttribute("aria-pressed", String(on));
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen?.().catch(() => toast(toastSlot, "Full screen isn't available in this browser"));
  }

  // ---- Palette and shortcuts (local until the shared overlays land) ----
  function overlay(dialog: HTMLElement, label: string, onKey?: (e: KeyboardEvent) => void): () => void {
    const prev = document.activeElement as HTMLElement | null;
    const scrim = h("div", { class: "scrim" }, dialog);
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", label);
    const close = () => {
      scrim.remove();
      document.removeEventListener("keydown", key, true);
      prev?.focus();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") {
        const f = $$<HTMLElement>(dialog, "input, button, [tabindex]");
        if (f.length) {
          const first = f[0]!;
          const last = f[f.length - 1]!;
          if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
          else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
        }
      }
      onKey?.(e);
    };
    scrim.addEventListener("pointerdown", (e) => {
      if (e.target === scrim) close();
    });
    document.addEventListener("keydown", key, true);
    root.append(scrim);
    return close;
  }

  function openShortcuts() {
    const dl = h(
      "dl",
      {},
      SHORTCUTS.flatMap((s) => [h("dt", {}, s.label), h("dd", {}, ...keyLabel(s.keys, mac).split(" / ").flatMap((k, i) => [i ? " / " : "", h("kbd", {}, k)]))]),
    );
    const d = h("div", { class: "dialog shortcuts" }, h("h2", {}, "Keyboard shortcuts"), dl, h("button", { class: "visually-hidden" }, "Close"));
    const close = overlay(d, "Keyboard shortcuts");
    $(d, "button").addEventListener("click", close);
    $(d, "button").focus();
  }

  interface Cmd {
    label: string;
    hint: string;
    group: string;
    run(): void;
  }
  function commands(): Cmd[] {
    const k = (keys: string) => keyLabel(keys, mac);
    return [
      { label: "Run tests", hint: k("⌘↵"), group: "Workspace", run: () => void run(false) },
      { label: "Submit attempt", hint: k("⌘⇧↵"), group: "Workspace", run: () => void run(true) },
      { label: "Format and save", hint: k("⌘S"), group: "Workspace", run: () => void save() },
      ...(exam ? [] : [{ label: "Pause or resume timer", hint: k("⌘."), group: "Workspace", run: togglePause }]),
      { label: "Focus mode", hint: k("⌘⇧F"), group: "Workspace", run: () => toggleFocusMode() },
      { label: "Zen: editor only", hint: "", group: "Workspace", run: () => panes.zen() },
      { label: "Toggle Problem pane", hint: k("⌘B"), group: "Workspace", run: () => panes.toggleProblem() },
      { label: "Toggle Tests pane", hint: k("⌘J"), group: "Workspace", run: () => panes.toggleTests() },
      { label: "Full screen", hint: "F11", group: "Workspace", run: toggleFullscreen },
      ...(interview || !hintItems.length ? [] : [{ label: "Next hint", hint: k("⌘H"), group: "Workspace", run: () => void revealHint() }]),
      ...(exam ? [] : [{ label: "Restart", hint: "", group: "Workspace", run: () => void restart() }, { label: "Give up", hint: "", group: "Workspace", run: () => void giveUp($(root, '.wbar [data-act="more"]')) }]),
      { label: settings.vim ? "Turn Vim mode off" : "Turn Vim mode on", hint: "", group: "Editor", run: () => updateSettings({ vim: !settings.vim }) },
      { label: "Editor settings", hint: "", group: "Editor", run: () => openSettings($(root, '[data-act="settings"]')) },
      { label: "Keyboard shortcuts", hint: "?", group: "Help", run: openShortcuts },
      { label: context ? `Back to ${context.title}` : "Back to Today", hint: "g t", group: "Go to", run: () => (location.href = backHref) },
    ];
  }
  function openPalette() {
    const input = h("input", { type: "text", placeholder: "Search problems and commands", "aria-label": "Search problems and commands", role: "combobox", "aria-expanded": "true", "aria-controls": "wsx-pal-list", autocomplete: "off", spellcheck: "false" }) as HTMLInputElement;
    const listEl = h("ul", { class: "palette-list", id: "wsx-pal-list", role: "listbox" });
    const d = h("div", { class: "dialog" }, h("div", { class: "palette-input", html: icon("search") }), listEl);
    $(d, ".palette-input").append(input);
    let sel = 0;
    let shown: Cmd[] = [];
    let problems: Cmd[] = [];
    loadCatalog()
      .then((c) => {
        const seen = new Set<string>();
        problems = c.catalog.problems.filter((p) => !seen.has(p.title) && !!seen.add(p.title)).map((p) => ({ label: p.title, hint: `LC ${p.leetcode}`, group: "Problems", run: () => (location.href = `/p/${encodeURIComponent(p.id)}`) }));
        draw();
      })
      .catch(() => {});
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const cmds = commands().filter((c) => !q || c.label.toLowerCase().includes(q));
      const probs = q ? problems.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase() === `lc ${q}`).slice(0, 8) : [];
      shown = [...cmds, ...probs];
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      listEl.replaceChildren();
      if (!shown.length) {
        listEl.append(h("li", { class: "palette-empty" }, `No match for '${input.value}'. Try a technique name or a LeetCode number`));
        input.removeAttribute("aria-activedescendant");
        return;
      }
      let group = "";
      shown.forEach((c, i) => {
        if (c.group !== group) {
          group = c.group;
          listEl.append(h("li", { class: "palette-group", role: "presentation" }, group));
        }
        const li = h("li", { class: "palette-item", role: "option", id: `wsx-pal-${i}`, "aria-selected": String(i === sel) }, h("span", {}, c.label), h("span", { class: "hint" }, c.hint));
        li.addEventListener("click", () => (close(), c.run()));
        listEl.append(li);
      });
      input.setAttribute("aria-activedescendant", `wsx-pal-${sel}`);
      document.getElementById(`wsx-pal-${sel}`)?.scrollIntoView({ block: "nearest" });
    };
    input.addEventListener("input", () => ((sel = 0), draw()));
    const close = overlay(d, "Search and commands", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(1, shown.length);
        draw();
      } else if (e.key === "Enter" && shown[sel]) {
        e.preventDefault();
        const c = shown[sel]!;
        close();
        c.run();
      }
    });
    draw();
    input.focus();
  }

  // ---- Problems cycling (F8) ----
  function cycleProblem(dir: 1 | -1) {
    if (!editor.cycleProblem(dir)) {
      toast(toastSlot, "No lint problems or failing tests");
      return;
    }
    panes.showMobile("code");
  }

  // ---- Actions and keys ----
  async function dontKnow() {
    await attempt.skip().catch(() => {});
    location.href = backHref;
  }

  async function act(a: Action | string, source?: HTMLElement) {
    switch (a) {
      case "dontKnow":
        return dontKnow();
      case "run":
        return run(false);
      case "submit":
        return run(true);
      case "runCustom":
        return runCustom();
      case "save":
        return save();
      case "nextProblem":
        return cycleProblem(1);
      case "prevProblem":
        return cycleProblem(-1);
      case "hint":
        return revealHint(hintConfirming);
      case "docs":
        return editor.docsAtCursor();
      case "pause":
        return togglePause();
      case "focusMode":
        return toggleFocusMode();
      case "toggleProblem":
        return panes.toggleProblem();
      case "toggleTests":
        return panes.toggleTests();
      case "nextPane":
        return panes.cycleFocus(1);
      case "prevPane":
        return panes.cycleFocus(-1);
      case "palette":
        return openPalette();
      case "fullscreen":
        return toggleFullscreen();
      case "shortcuts":
        return openShortcuts();
      case "back":
        location.href = backHref;
        return;
      case "escape":
        if (closePopover()) return;
        if (resultOpen) closeResult(true);
        return;
      case "more":
        return moreMenu(source ?? $(root, '[data-act="more"]'));
      case "settings":
        return openSettings(source ?? $(root, '[data-act="settings"]'));
      case "drafts":
        return openDrafts(source ?? $(root, '[data-act="drafts"]'));
      case "zen":
        return panes.zen();
      case "toggleVim":
        return updateSettings({ vim: !settings.vim });
      case "focusTests":
        panes.revealTests();
        showTestsTab("tests");
        return $(root, '[data-ttab="tests"]').focus();
    }
  }

  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!b || !root.contains(b)) return;
    e.preventDefault();
    void act(b.dataset["act"] ?? "", b);
  });
  for (const k of $$<HTMLButtonElement>(root, "[data-key]")) {
    // Keep the editor focused (and the phone keyboard up) while tapping a key.
    k.addEventListener("pointerdown", (e) => e.preventDefault());
    k.addEventListener("click", () => editor.insert(k.dataset["key"] ?? ""));
  }

  const chord = chordHandler();
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.defaultPrevented || e.isComposing) return;
      const active = document.activeElement as HTMLElement | null;
      const inEditor = !!active?.closest(".cm-editor");
      const inField = !inEditor && !!active && (active.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && (active as HTMLInputElement).type !== "checkbox"));
      if (root.querySelector(".scrim")) return;
      const ctx = { mac, inEditor, inField, inCustomField: !!active?.hasAttribute("data-custom-field") };
      const a = actionFor(e, ctx) ?? chord(e, ctx, performance.now());
      if (!a) return;
      if (a === "escape" && !resultOpen && !root.querySelector(".popover")) return;
      if (resultOpen && e.key === "Enter" && !inEditor) return;
      e.preventDefault();
      e.stopPropagation();
      void act(a);
    },
    { capture: true },
  );

  if (context) root.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>(".practice-nav a, a[data-back], .result a");
    if (!link || link.target === "_blank" || new URL(link.href).origin !== location.origin) return;
    e.preventDefault();
    void flushDraft().then((saved) => {
      if (saved) location.href = link.href;
      else toast(toastSlot, "Couldn’t save your draft. Save or copy your code before leaving");
    });
  });

  // ---- Leaving ----
  window.addEventListener("pagehide", () => {
    void flushDraft();
    if (!exam && attempt.opened && !attempt.end) void attempt.leave();
  });
  window.addEventListener("online", renderRuntime);
  window.addEventListener("offline", renderRuntime);

  // Late data.
  void trainerP.then(() => {
    const st = trainer?.states(events)[id];
    setTag(st, review);
    renderReason();
    renderHistory();
  });

  function renderReason() {
    const el = root.querySelector<HTMLElement>("[data-reason]");
    const pace = root.querySelector<HTMLElement>("[data-pace]");
    if (!el || !pace || !trainer || interview) return;
    if (opts.renderReason) {
      opts.renderReason(el, { problem: id, events, trainer });
    } else {
      try {
        const entry = trainer.today(events).find((e) => e.problem === id);
        if (entry?.reason) el.textContent = entry.reason;
      } catch {
        // No reason: the breadcrumb stays.
      }
    }
    try {
      const usual = trainer.stats(events).median_secs[meta.difficulty];
      const target = Math.round(targetMs / 60_000);
      pace.replaceChildren("Target ", h("b", {}, `${target} min`), ".", ...(usual ? [" You usually take ", h("b", {}, String(Math.max(1, Math.round(usual / 60)))), "."] : []));
      pace.hidden = false;
    } catch {
      pace.hidden = true;
    }
  }
  void filesP.then(() => renderSolution());
  renderSolution();

  function setTag(st: State | undefined, isReview: boolean) {
    const tag = $(root, "[data-tag]");
    if (interview) {
      tag.hidden = true;
      return;
    }
    const [text, cls] = isReview
      ? ["Review", "tag-due"]
      : !st || st.rung < 0
        ? ["New", "tag-new"]
        : st.status === "mastered"
          ? ["Mastered", "tag-pass"]
          : ["Practice", "tag-progress"];
    tag.textContent = mode === "drill" ? "Keep sharp" : text;
    tag.className = `tag ${mode === "drill" ? "tag-sharp" : cls}`;
    tag.hidden = false;
  }
}
