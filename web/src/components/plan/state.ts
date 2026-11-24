// The Plan page's state: Solid signals for what's shown, and the actions that change it.
// Prefs stay the source of truth; changing them re-plans (onPrefsChange in PlanApp).
import { batch, createMemo, createSignal, untrack } from "solid-js";
import { sentenceCase } from "../../lib/display";
import { recordPlanned } from "../../lib/plan-progress";
import { spreadDays } from "../../lib/plan-copy";
import { planSettings, readPrefs, updatePrefs } from "../../lib/prefs";
import { toPlanned } from "../../lib/reminders";
import { MOCK_LEAD_MIN } from "../../lib/mock-today";
import { addMove, clock, fmtM, isoDay, midSentence, minuteOf, moveFor, skipBudget, toggleDayOff } from "../../lib/schedule";
import type { Plan, PlanDay, PlanSession } from "../../lib/types";
import { keepArriving, plural } from "../../lib/ui/bits";
import type { AvailabilityEditor } from "../../lib/ui/availability";
import { toast } from "../../lib/ui/overlay";
import { colsNow, dayName, gridOf, narrow, reduced, rememberRoadmap, ROADMAPS, vdays, type Ctx, type View } from "./model";

export type Pop = { kind: "ses"; id: string; move: boolean } | { kind: "day"; index: number };
export type Enter = "next" | "prev" | "view";
export interface Live {
  label: string;
  line: string;
}

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

/** "Graphs is on track; dynamic programming is behind by 1." from the new forecast. */
function forecastLine(prev: Plan, next: Plan): string {
  const changed = next.forecast.filter((f) => {
    const p = prev.forecast.find((x) => x.module === f.module && x.technique === f.technique);
    return p && p.behind_by !== f.behind_by;
  });
  const parts = (changed.length ? changed : next.forecast.filter((f) => f.behind_by > 0)).slice(0, 3).map((f, i) => {
    const name = i === 0 ? sentenceCase(f.title) : midSentence(f.title);
    return f.behind_by ? `${name} is behind by ${f.behind_by}` : `${name} is on track`;
  });
  if (!parts.length) return next.forecast.length ? "Every target is on track" : "";
  return parts.join("; ");
}

/** Today's planned sessions, for the session reminders (shell.ts), and today's load for the kept-sessions record. */
function rememberSessions(p: Plan): void {
  recordPlanned(p);
  const day = p.days[0];
  try {
    localStorage.setItem("myleet:sessions", JSON.stringify({ day: day?.date, sessions: (day?.sessions ?? []).map((s) => toPlanned(s, MOCK_LEAD_MIN)) }));
  } catch {
    // Reminders fall back to the daily time.
  }
}

// FLIP after a re-plan: re-planning swaps the elements, so glide the ones that moved from where they were.
type Snap = Map<string, Record<string, string>>;
const MORPH: [string, (el: HTMLElement) => string | null, string[]][] = [
  [".ses[data-ses]", (el) => el.dataset.ses ?? null, ["top", "height"]],
  [".dh .load .bar span", (el) => `l${el.closest<HTMLElement>(".dh")?.dataset.date}`, ["width"]],
];

function snapshot(root: HTMLElement | undefined): Snap {
  const out: Snap = new Map();
  if (!root) return out;
  for (const [sel, key, props] of MORPH)
    for (const el of root.querySelectorAll<HTMLElement>(sel)) {
      const k = key(el);
      if (!k) continue;
      const cs = getComputedStyle(el);
      out.set(k + sel, Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])));
    }
  root.querySelectorAll<HTMLElement>(".fc-row").forEach((row, i) =>
    row.querySelectorAll<HTMLElement>(".fc-bar > span, .fc-bar .need").forEach((s, j) => out.set(`f${i}.${j}`, { width: getComputedStyle(s).width, left: getComputedStyle(s).left })),
  );
  return out;
}

function morph(root: HTMLElement | undefined, before: Snap): void {
  if (!root || reduced() || !before.size) return;
  const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-spring").trim() || "ease-out";
  const go = (el: HTMLElement, from: Record<string, string>, props: string[]) => {
    const cs = getComputedStyle(el);
    const to = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    if (props.every((p) => from[p] === to[p])) return;
    el.animate([Object.fromEntries(props.map((p) => [p, from[p] ?? to[p]])), to], { duration: 240, easing: ease });
  };
  for (const [sel, key, props] of MORPH)
    for (const el of root.querySelectorAll<HTMLElement>(sel)) {
      const k = key(el);
      const from = k ? before.get(k + sel) : undefined;
      if (from) go(el, from, props);
    }
  root.querySelectorAll<HTMLElement>(".fc-row").forEach((row, i) =>
    row.querySelectorAll<HTMLElement>(".fc-bar > span, .fc-bar .need").forEach((s, j) => {
      const f = before.get(`f${i}.${j}`);
      if (f) go(s, f, s.classList.contains("need") ? ["left"] : ["width"]);
    }),
  );
}

export function createPlan() {
  const [ctx, setCtx] = createSignal<Ctx>();
  const [status, setStatus] = createSignal<"loading" | "gate" | "error" | "ready">("loading");
  const [failure, setFailure] = createSignal("");
  const [view, setViewSig] = createSignal<View>("week");
  const [offset, setOffsetSig] = createSignal(0);
  const [cols, setCols] = createSignal(colsNow());
  const [vh, setVh] = createSignal(innerHeight);
  /** Folded spans the learner opened (a click, a drag hovering, a keyboard move); forgotten when the week changes. */
  const [opened, setOpened] = createSignal<[number, number][]>([]);
  const [nowMin, setNowMin] = createSignal(minuteOf(Date.now()));
  const [pop, setPop] = createSignal<Pop | null>(null);
  const [popLeaving, setPopLeaving] = createSignal(false);
  const [menu, setMenu] = createSignal<{ day: string; left: number; top: number } | null>(null);
  const [drawer, setDrawer] = createSignal<"closed" | "open" | "leaving">("closed");
  const [change, setChange] = createSignal<{ weekday?: number; focusDate?: boolean } | null>(null);
  const [live, setLive] = createSignal<Live | null>(null);

  const refs: { root?: HTMLElement; body?: HTMLElement; calMain?: HTMLElement; popInner?: HTMLElement; thumb?: HTMLElement; drawer?: HTMLElement } = {};
  const plan = createMemo(() => ctx()?.plan);
  const events = createMemo(() => ctx()?.events);
  // Only a new plan or new events change the days, so a fixes update keeps the same columns (and focus).
  const days = createMemo(() => {
    plan();
    events();
    const c = untrack(ctx);
    return c ? vdays(c, cols()) : [];
  });
  const shown = createMemo(() => days().slice(offset(), offset() + cols()));
  const grid = createMemo(() => {
    const c = ctx();
    return c ? gridOf(c, shown(), opened(), vh()) : null;
  });
  const openSes = createMemo(() => {
    const p = pop();
    return p?.kind === "ses" && !popLeaving() ? p.id : null;
  });

  let pending: string | null = null;
  let queued = false;
  let fixesKey = "";
  let popTimer: ReturnType<typeof setTimeout> | undefined;
  let drawerTimer: ReturnType<typeof setTimeout> | undefined;
  let fitTimer: ReturnType<typeof setTimeout> | undefined;
  let afterDrawer: (() => void) | null = null;
  let editor: AvailabilityEditor | null = null;

  const say = (m: string) => {
    const sr = document.getElementById("plan-sr");
    if (sr) sr.textContent = m;
  };

  const findSession = (id: string): [PlanDay, PlanSession] | null => {
    for (const d of ctx()?.plan.days ?? []) for (const s of d.sessions) if (s.id === id) return [d, s];
    return null;
  };

  function setOffset(n: number): void {
    if (n === offset()) return;
    batch(() => {
      setOffsetSig(n);
      setOpened([]);
    });
  }

  /** Re-lays the week for a new scale in place (elements stay, so a drag survives) and glides for 200 ms. */
  function fitting(): void {
    const body = refs.body;
    clearTimeout(fitTimer);
    if (!body || reduced()) return;
    body.classList.add("fitting");
    fitTimer = setTimeout(() => body.classList.remove("fitting"), 260);
  }

  /** Opens a folded span so its hours can be seen and dropped into. */
  function unfold(from: number, to: number): void {
    if (opened().some(([a, b]) => a === from && b === to)) return;
    fitting();
    setOpened([...opened(), [from, to]]);
  }

  /** Week to week slides the way you moved; switching views cross-fades. Starts part-visible so fast presses never flash. */
  function playEnter(how: Enter | null): void {
    const el = refs.calMain;
    if (!how || !el) return;
    const still = reduced();
    const dx = how === "next" ? 16 : how === "prev" ? -16 : 0;
    el.animate(still ? [{ opacity: 0.4 }, { opacity: 1 }] : [{ opacity: 0.4, transform: dx ? `translateX(${dx}px)` : "translateY(4px)" }, { opacity: 1, transform: "none" }], {
      duration: still ? 120 : 200,
      easing: EASE_OUT,
    });
  }

  function setView(next: View): void {
    if (next === view()) return;
    const th = refs.thumb;
    const was = th?.getBoundingClientRect();
    batch(() => {
      setViewSig(next);
      if (pop()?.kind === "ses" && next !== "week") hidePop();
    });
    history.replaceState(history.state, "", next === "week" ? location.pathname : `${location.pathname}?view=${next}`);
    playEnter("view");
    // The view switch's thumb sits in the pressed button's grid cell, then glides from where it was.
    const now = th?.getBoundingClientRect();
    if (th && was && now?.width && !reduced() && (was.left !== now.left || was.width !== now.width))
      th.animate([{ transform: `translateX(${was.left - now.left}px)`, width: `${was.width}px` }, { transform: "none", width: `${now.width}px` }], { duration: 200, easing: EASE_OUT });
  }

  function nav(dir: 1 | -1): void {
    const was = offset();
    const next = Math.max(0, Math.min(days().length - 1, was + dir * cols()));
    if (next === was) return;
    setOffset(next);
    playEnter(next > was ? "next" : "prev");
  }

  function computeFixes(): void {
    const c = ctx();
    if (!c) return;
    const key = JSON.stringify(planSettings()) + c.events.length + isoDay(c.now);
    if (key === fixesKey) return;
    fixesKey = key;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 50));
    idle(() => {
      const cur = ctx();
      if (!cur || key !== fixesKey) return;
      let fixes = null;
      try {
        fixes = cur.t.planFixes(cur.events, planSettings(), { now: cur.now.getTime() });
      } catch {
        fixes = null;
      }
      const before = snapshot(refs.root);
      setCtx({ ...cur, fixes });
      morph(refs.root, before);
    });
  }

  function load(c: Ctx): void {
    rememberSessions(c.plan);
    batch(() => {
      setCtx(c);
      setStatus("ready");
    });
    computeFixes();
  }

  function fail(e: unknown): void {
    setFailure(`${navigator.onLine ? `The planner stopped before it finished (${e instanceof Error ? e.message : "unknown error"}).` : "You're offline and the curriculum isn't cached on this device yet"} Your progress and your settings are safe, and Today's queue works as usual`);
    setStatus("error");
  }

  function replan(): void {
    queued = false;
    const c = ctx();
    if (!c) return;
    const before = snapshot(refs.root);
    let next: Plan;
    try {
      next = c.t.plan(c.events, planSettings(), { now: c.now.getTime() });
    } catch (e) {
      return fail(e);
    }
    const nc: Ctx = { ...c, plan: next, fixes: null };
    const label = pending;
    pending = null;
    rememberSessions(next);
    batch(() => {
      setCtx(nc);
      if (label) setLive({ label, line: forecastLine(c.plan, next) });
      setOffset(Math.min(offset(), Math.max(0, vdays(nc, cols()).length - 1)));
      const p = pop();
      if (p?.kind === "ses" && !findSession(p.id)) hidePop();
    });
    keepArriving(refs.root ?? null);
    morph(refs.root, before);
    editor?.refresh();
    computeFixes();
  }

  function queueReplan(): void {
    if (queued) return;
    queued = true;
    // A direct replan() in the meantime clears the flag, so this frame doesn't re-plan (and re-render) twice.
    requestAnimationFrame(() => queued && replan());
  }

  function hidePop(): void {
    clearTimeout(popTimer);
    setPop(null);
    setPopLeaving(false);
  }

  function animatePop(swap: boolean): void {
    if (reduced()) return;
    refs.popInner?.animate(swap ? [{ opacity: 0.5 }, { opacity: 1 }] : [{ opacity: 0, transform: narrow() ? "translateY(24px)" : "translateX(16px)" }, { opacity: 1, transform: "none" }], {
      duration: swap ? 150 : 200,
      easing: EASE_OUT,
    });
  }

  const focusPopClose = () => refs.popInner?.querySelector<HTMLElement>("[data-pop-close]")?.focus({ preventScroll: true });

  /** The session inspector, docked beside the week on wide screens (the grid narrows, nothing is covered). */
  function openPop(id: string, opts: { move?: boolean; focus?: boolean } = {}): void {
    if (!findSession(id)) return;
    const cur = pop();
    const fresh = !cur || popLeaving();
    const swap = !fresh && !(cur?.kind === "ses" && cur.id === id);
    clearTimeout(popTimer);
    batch(() => {
      setPop({ kind: "ses", id, move: !!opts.move });
      setPopLeaving(false);
    });
    if (fresh || swap) animatePop(swap);
    if (opts.focus !== false) focusPopClose();
  }

  /** Month view: a day's interviews and sessions in the side panel, so choosing a day doesn't leave the month. */
  function openDayPop(index: number): void {
    if (!ctx()?.plan.days[index]) return;
    const fresh = !pop() || popLeaving();
    clearTimeout(popTimer);
    batch(() => {
      setPop({ kind: "day", index });
      setPopLeaving(false);
    });
    if (fresh) animatePop(false);
    focusPopClose();
  }

  function closePop(): void {
    const p = pop();
    if (!p || popLeaving()) return;
    // The column collapses over 200 ms; keep the content until it has, unless something reopens it.
    if (reduced() || narrow()) hidePop();
    else {
      setPopLeaving(true);
      clearTimeout(popTimer);
      popTimer = setTimeout(hidePop, 200);
    }
    if (p.kind === "ses") refs.root?.querySelector<HTMLElement>(`[data-ses="${CSS.escape(p.id)}"]`)?.focus({ preventScroll: true });
  }

  function openDayMenu(day: string, btn: HTMLElement): void {
    const host = refs.root?.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    if (!host) return;
    setMenu({ day, left: Math.min(r.right - 220, innerWidth - 236) - host.left, top: r.bottom + 4 - host.top });
  }

  function openDrawer(): void {
    clearTimeout(drawerTimer);
    if (drawer() === "open") return void refs.drawer?.querySelector<HTMLElement>("button")?.focus();
    setMenu(null);
    // Reopened mid-close: the mounted editor stays and the drawer slides back in.
    setDrawer("open");
  }

  function closeDrawer(): void {
    if (drawer() !== "open") return;
    const done = () => {
      setDrawer("closed");
      const back = afterDrawer;
      afterDrawer = null;
      if (back) back();
      else refs.root?.querySelector<HTMLElement>('[data-act="avail"]')?.focus();
    };
    if (reduced()) return done();
    setDrawer("leaving");
    drawerTimer = setTimeout(done, 200);
  }

  function withUndo(message: string, patch: Parameters<typeof updatePrefs>[0], previous: Parameters<typeof updatePrefs>[0]): void {
    updatePrefs(patch);
    toast(message, { ms: 8000, action: { label: "Undo", run: () => updatePrefs(previous) } });
  }

  function toggleOff(day: string): void {
    const c = ctx();
    if (!c) return;
    const count = c.plan.days.find((d) => d.date === day)?.sessions.flatMap((s) => s.items).length ?? 0;
    const prev = readPrefs().plan.daysOff;
    const next = toggleDayOff(prev, day, c.plan.start);
    withUndo(
      next.includes(day) ? `${dayName(day)} is off.${count ? ` Its ${plural(count, "item")} moved to the next free windows.` : ""} Nothing is late` : `${dayName(day)} is back in the plan`,
      { plan: { daysOff: next } },
      { plan: { daysOff: prev } },
    );
  }

  function toggleShorter(day: string): void {
    const prev = readPrefs().plan.dayMinutes;
    const has = prev.some((x) => x.date === day);
    const today = ctx()?.plan.start ?? isoDay(new Date());
    const next = has ? prev.filter((x) => x.date !== day) : [...prev.filter((x) => x.date >= today), { date: day, minutes: 30 }];
    withUndo(has ? `${dayName(day)} is back to its usual time` : `${dayName(day)} is 30 min. The rest moves to the next free windows`, { plan: { dayMinutes: next } }, { plan: { dayMinutes: prev } });
  }

  function skipSession(id: string): void {
    const hit = findSession(id);
    const c = ctx();
    if (!hit || !c) return;
    const [d, s] = hit;
    const prev = readPrefs().plan.dayMinutes;
    const next = skipBudget(prev, d, s, c.plan.start);
    closePop();
    withUndo(`Skipped. Its ${plural(s.items.length, "item")} moved to the next free windows`, { plan: { dayMinutes: next } }, { plan: { dayMinutes: prev } });
  }

  /** Moves a session and re-plans at once, then says where it landed and what that did to the day's reviews. */
  function applyMove(id: string, to: string, start: number): void {
    const c = ctx();
    const hit = findSession(id);
    if (!c || !hit) return;
    const [d, s] = hit;
    const prev = readPrefs().plan.moves;
    const reviews = (p: Plan | undefined) => p?.days.find((x) => x.date === to)?.sessions.flatMap((x) => x.items).filter((i) => i.kind === "review").length ?? 0;
    const reviewsBefore = reviews(c.plan);
    const wasOpen = !!openSes();
    updatePrefs({ plan: { moves: addMove(prev, moveFor(s, d.date, to, start), c.plan.start) } });
    replan();
    // The inspector follows the session to where it landed.
    const toDay = ctx()?.plan.days.find((x) => x.date === to);
    const landed = toDay?.sessions.find((x) => minuteOf(x.start_ms) === start) ?? toDay?.sessions.find((x) => x.moved_from);
    if (wasOpen && landed) openPop(landed.id, { focus: false });
    const after = reviews(ctx()?.plan);
    const fit = after >= reviewsBefore ? "Reviews due that day still fit" : `${plural(reviewsBefore - after, "review")} moved to the next day`;
    const msg = `Moved to ${dayName(to)}, ${clock(landed ? minuteOf(landed.start_ms) : start)}. ${fit}`;
    say(msg);
    toast(msg, { ms: 8000, action: { label: "Undo", run: () => updatePrefs({ plan: { moves: prev } }) } });
  }

  function setBudget(value: number): void {
    const p = readPrefs().plan;
    pending = `Weekdays ${fmtM(value)}`;
    updatePrefs({ plan: { dailyMinutes: value, weekendMinutes: p.weekendMinutes ?? p.dailyMinutes ?? 60 } });
  }

  /** Catch-up after a slip: the missed minutes spread over the next three planned days. */
  function spreadMissed(minutes: number): void {
    const c = ctx();
    if (!c) return;
    const p = readPrefs().plan;
    const s = spreadDays(c.plan, p, minutes);
    if (!s) return;
    withUndo(`Added ${fmtM(s.each)} to each of the next ${s.count === 1 ? "day" : `${s.count} days`}`, { plan: { dayMinutes: s.dayMinutes } }, { plan: { dayMinutes: p.dayMinutes } });
  }

  function startRoadmap(n: number): void {
    const r = ROADMAPS.find((x) => x.days === n);
    if (!r) return;
    rememberRoadmap(String(n));
    const due = new Date();
    due.setDate(due.getDate() + r.days);
    const today = isoDay(new Date());
    // Technique emphasis comes from the learner's target companies; with none picked the planner aims at general readiness.
    updatePrefs({ plan: { interviewDate: isoDay(due), dailyMinutes: r.weekday, weekendMinutes: r.weekend, startedAt: today, history: [...readPrefs().plan.history, { date: today, kind: "preset", text: `Started the ${r.label.toLowerCase()}` }] } });
    setView("roadmap");
  }

  /** Shows the week holding plan day `index`, and opens its first session or focuses its header. */
  function goTo(index: number, openFirst = false): void {
    const c = ctx();
    if (!c) return;
    const n = cols();
    const wasView = view();
    const was = offset();
    const total = days().length;
    // Whole calendar weeks in the 7-day view; the 4-day view rolls from the day you picked.
    let next = Math.max(0, Math.min(index + (n === 7 ? days().length - c.plan.days.length : 0), total - 1));
    if (n === 7) next = Math.floor(next / 7) * 7;
    else {
      if (next > 0) next = Math.max(0, Math.min(next, total - n));
      if (index < next || index >= next + n) next = index;
    }
    batch(() => {
      setViewSig("week");
      setOffset(next);
      hidePop();
    });
    if (wasView !== "week") history.replaceState(history.state, "", location.pathname);
    playEnter(wasView !== "week" ? "view" : next > was ? "next" : next < was ? "prev" : null);
    const day = c.plan.days[index];
    if (!day) return;
    if (openFirst && day.sessions[0]) openPop(day.sessions[0].id);
    else refs.root?.querySelector<HTMLElement>(`.dh[data-date="${day.date}"]`)?.focus({ preventScroll: true });
  }

  return {
    refs,
    ctx,
    setCtx,
    plan,
    status,
    setStatus,
    failure,
    view,
    setView,
    setViewSig,
    offset,
    setOffset,
    cols,
    setCols,
    setVh,
    opened,
    days,
    grid,
    nowMin,
    setNowMin,
    pop,
    popLeaving,
    openSes,
    menu,
    setMenu,
    drawer,
    change,
    setChange,
    live,
    say,
    findSession,
    fitting,
    unfold,
    nav,
    load,
    fail,
    replan,
    queueReplan,
    openPop,
    openDayPop,
    closePop,
    hidePop,
    openDayMenu,
    openDrawer,
    closeDrawer,
    afterDrawer: (fn: () => void) => (afterDrawer = fn),
    setEditor: (e: AvailabilityEditor | null) => (editor = e),
    toggleOff,
    toggleShorter,
    skipSession,
    applyMove,
    setBudget,
    budgetLabel: (label: string) => (pending = label),
    spreadMissed,
    startRoadmap,
    goTo,
    resetFixes: () => (fixesKey = ""),
  };
}

export type PlanState = ReturnType<typeof createPlan>;
