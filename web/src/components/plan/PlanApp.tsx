import { createMemo, createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { takePending } from "../../lib/access";
import { signedIn } from "../../lib/account";
import { loadCatalog } from "../../lib/catalog";
import { onPrefsChange, planSettings, readPrefs, updatePrefs } from "../../lib/prefs";
import { readEvents } from "../../lib/progress";
import { DEFAULT_WINDOWS, fmtM, isoDay, minuteOf } from "../../lib/schedule";
import { loadTrainer } from "../../lib/trainer";
import type { Habits } from "../../lib/types";
import { arrive } from "../../lib/ui/bits";
import { featureGate } from "../../lib/ui/guest-gate";
import { icon } from "../../lib/ui/icons";
import { errorPanel, toast } from "../../lib/ui/overlay";
import { dismissNote } from "../../lib/ui/personal";
import { ROUTES } from "../../lib/routes";
import { colsNow, currentNote, GCAL_LANDED, isMock, mockDone, mockLink, type Ctx } from "./model";
import { createMover } from "./move";
import { ChangeDialog, DayMenu, Drawer, Inspector } from "./Panels";
import { raw } from "./raw";
import Skeleton from "./Skeleton";
import { createPlan } from "./state";
import { Agenda, EmptyState, Forecast, Head, Month, Note, openSync, Road, Toolbar, You } from "./Views";
import { Week } from "./Week";

const LEGEND: [string, string][] = [
  ["var(--mix-review)", "Reviews"],
  ["var(--mix-weak)", "Weak spot"],
  ["var(--mix-new)", "New topic"],
  ["var(--mix-progress)", "In progress"],
  ["var(--mix-sharp)", "Keep sharp"],
  ["var(--mix-mock)", "Mock interview"],
];

export default function PlanApp() {
  const s = createPlan();
  let ghost: HTMLElement | undefined;
  let tip: HTMLElement | undefined;
  const mover = createMover(
    s,
    () => ghost,
    () => tip,
  );
  const [gate, setGate] = createSignal("");
  // Prefs changes re-plan, so these follow the plan.
  const hasWindows = createMemo(() => (s.plan(), readPrefs().plan.availability.length > 0));
  const hasBusy = createMemo(() => (s.plan(), readPrefs().plan.busy.length > 0));
  const monthKey = createMemo(() => {
    const c = s.ctx();
    return c && s.view() !== "week" ? { c, whole: s.view() === "roadmap" } : null;
  });

  const cleanParam = (k: string) => {
    const q = new URLSearchParams(location.search);
    q.delete(k);
    history.replaceState(history.state, "", `${location.pathname}${q.size ? `?${q}` : ""}${location.hash}`);
  };

  async function init(): Promise<void> {
    const v = new URLSearchParams(location.search).get("view");
    s.setViewSig(v === "month" || v === "roadmap" ? v : "week");
    s.setOffset(0);
    s.hidePop();
    try {
      const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
      if (!signedIn()) {
        setGate(String(featureGate("plan", t.placement(events).done)));
        s.setStatus("gate");
        return;
      }
      const now = new Date();
      const plan = t.plan(events, planSettings(), { now: now.getTime() });
      let habits: Habits | null = null;
      try {
        habits = t.habits(events, { now: now.getTime(), limit: 3 });
      } catch {
        habits = null;
      }
      s.resetFixes();
      s.load({ t, cat, events, now, plan, fixes: null, habits });
      // Plans made before the progress line had no start; count from the first visit with a date.
      if (plan.interview_date && !readPrefs().plan.startedAt) updatePrefs({ plan: { startedAt: plan.start } }, { silent: true });
      const hash = location.hash.slice(1);
      const hi = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? plan.days.findIndex((d) => d.date === hash) : -1;
      if (hi >= 0) s.goTo(hi, true);
      arrive(s.refs.root ?? null);
      // "Edit goals" and "When do you practice?" from other pages land here with the editor open.
      const edit = new URLSearchParams(location.search).get("edit");
      if (edit) {
        cleanParam("edit");
        if (edit === "goals") s.setChange({});
        else if (edit === "availability") s.openDrawer();
      }
      // Back from sign-up with the calendar dialog still wanted: reopen it.
      if (signedIn() && takePending("calendar-sync")) openSync(s);
      // Back from Google's consent screen (GET /api/calendar/google/connect).
      const gcal = new URLSearchParams(location.search).get("gcal");
      if (gcal) {
        cleanParam("gcal");
        toast(GCAL_LANDED[gcal] ?? GCAL_LANDED["upstream"] ?? "");
      }
    } catch (e) {
      s.fail(e);
    }
  }

  async function refreshEvents(): Promise<void> {
    const c = s.ctx();
    if (!c) return;
    c.events = await readEvents();
    c.now = new Date();
    try {
      c.habits = c.t.habits(c.events, { now: c.now.getTime(), limit: 3 });
    } catch {
      // Keep the last insights.
    }
    s.replan();
  }

  /** Buttons inside shared renderers (notes, forecast rows, the error panel) carry data attributes instead of handlers. */
  function onHelperClick(e: MouseEvent): void {
    const a = (e.target as Element).closest<HTMLElement>("[data-note-act],[data-note-dismiss],[data-fix],[data-retry]");
    if (!a) return;
    if (a.matches("[data-retry]")) return void init();
    const c = s.ctx();
    if (!c) return;
    const d = a.dataset;
    if (d.fix) return void s.setChange({ weekday: Number(d.fix) });
    const note = currentNote(c);
    const refresh = (): void => void s.setCtx({ ...c });
    if (d.noteDismiss !== undefined) {
      if (note) dismissNote(note);
      return refresh();
    }
    const value = Number(d.value);
    switch (d.noteAct) {
      case "weekday_minutes":
        return void s.setChange({ weekday: value });
      case "availability":
        return s.openDrawer();
      case "set_date":
      case "change_plan":
        return void s.setChange({ focusDate: true });
      case "keep_pace":
        if (note) dismissNote(note);
        return refresh();
      case "spread":
        if (note) dismissNote(note);
        return s.spreadMissed(value);
      case "add_time": {
        if (note) dismissNote(note);
        const p = readPrefs().plan;
        updatePrefs({ plan: { history: [...p.history, { date: isoDay(new Date()), kind: "time", text: `Weekdays from ${fmtM(p.dailyMinutes ?? 60)} to ${fmtM(value)} to catch up` }] } }, { silent: true });
        return s.setBudget(value);
      }
      case "roadmap":
        return s.startRoadmap(value);
      case "clear_date":
        return void updatePrefs({ plan: { interviewDate: null } });
    }
  }

  // Any click outside the popover closes it (a session click reopens it on that session), and outside the day menu
  // closes that. Capture phase, so it runs before the click's own handler opens something new.
  function onDocClick(e: MouseEvent): void {
    const t = e.target as Element;
    if (!t.closest(".daymenu-pop") && !t.closest(".daymenu")) s.setMenu(null);
    if (!t.closest("[data-pop]") && !t.closest(".ses") && !t.closest(".toast")) s.closePop();
  }

  /** j / k: session to session in time order. */
  function moveFocus(dir: 1 | -1): void {
    const start = (el: HTMLElement) => s.findSession(el.dataset.ses ?? "")?.[1].start_ms ?? 0;
    const all = [...(s.refs.body?.querySelectorAll<HTMLElement>(".ses:not(.done)") ?? [])].sort((a, b) => start(a) - start(b));
    const i = all.indexOf(document.activeElement as HTMLElement);
    all[i < 0 ? (dir > 0 ? 0 : all.length - 1) : Math.max(0, Math.min(all.length - 1, i + dir))]?.focus();
  }

  let lastKey = { key: "", at: 0 };
  function onKey(e: KeyboardEvent): void {
    if (s.status() !== "ready" || !s.ctx()) return;
    const prevKey = lastKey;
    lastKey = { key: e.key, at: Date.now() };
    if (e.key === "Escape") {
      if (mover.lifting()) return (e.preventDefault(), mover.kbEnd(false));
      if (s.menu()) return void s.setMenu(null);
      if (s.pop() && !s.popLeaving()) return s.closePop();
      if (s.drawer() === "open") return s.closeDrawer();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable)) return;
    if (active?.closest("[data-av-drawer]")) return;
    if (mover.lifting()) {
      if (e.key.startsWith("Arrow")) return (e.preventDefault(), mover.kbStep(e.key));
      if (e.key === " " || e.key === "Enter") return (e.preventDefault(), mover.kbEnd(true));
      return;
    }
    const ses = active?.closest<HTMLElement>(".wk-body .ses:not(.done)");
    if (ses && e.key === " ") return (e.preventDefault(), mover.kbLift(ses));
    if (ses && e.key === "Enter") {
      e.preventDefault();
      const hit = s.findSession(ses.dataset.ses ?? "");
      if (hit && isMock(hit[1]) && !mockDone(hit[1])) return void (location.href = mockLink(hit[1]));
      return s.openPop(ses.dataset.ses ?? "");
    }
    // "g t" belongs to the shell's go-to keys.
    if (prevKey.key === "g" && Date.now() - prevKey.at < 1200) return;
    const dh = active?.closest<HTMLElement>(".dh");
    if (e.key === "o" && dh?.dataset.date) return (e.preventDefault(), s.toggleOff(dh.dataset.date));
    const keys: Record<string, () => void> = {
      t: () => s.goTo(0),
      "[": () => s.view() === "week" && s.nav(-1),
      "]": () => s.view() === "week" && s.nav(1),
      w: () => s.setView("week"),
      m: () => s.setView("month"),
      a: () => s.openDrawer(),
      c: () => openSync(s),
      s: () => {
        const start = s.refs.root?.querySelector<HTMLAnchorElement>("[data-start]");
        if (start) location.href = start.href;
      },
      j: () => moveFocus(1),
      k: () => moveFocus(-1),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  }

  onMount(() => {
    const ac = new AbortController();
    const on = (t: EventTarget, ev: string, fn: (e: never) => void, capture = false) => t.addEventListener(ev, fn as EventListener, { signal: ac.signal, capture });
    on(document, "click", onDocClick, true);
    on(document, "keydown", onKey);
    on(document, "pointermove", (e: PointerEvent) => mover.onPointerMove(e));
    on(document, "pointerup", (e: PointerEvent) => mover.endDrag(e));
    on(document, "pointercancel", (e: PointerEvent) => mover.endDrag(e, true));
    for (const ev of ["myleet:synced", "myleet:progress"]) on(window, ev, () => void refreshEvents());
    on(window, "myleet:auth", () => void init());
    const repaint = () => {
      const c = s.ctx();
      if (c) s.setCtx({ ...c });
    };
    on(window, "online", repaint);
    on(window, "offline", repaint);
    let refit = 0;
    on(window, "resize", () => {
      if (colsNow() !== s.cols()) return void s.setCols(colsNow());
      cancelAnimationFrame(refit);
      refit = requestAnimationFrame(() => {
        s.fitting();
        s.setVh(innerHeight);
      });
    });
    on(document, "visibilitychange", () => {
      const c = s.ctx();
      if (document.visibilityState === "visible" && c) {
        c.now = new Date();
        s.replan();
      }
    });
    const stop = onPrefsChange(() => {
      if (s.ctx()) s.queueReplan();
    });
    // The now line keeps up while the page is open.
    const tick = setInterval(() => {
      const c = s.ctx();
      if (c && document.visibilityState === "visible" && !mover.busy()) {
        c.now = new Date();
        s.setNowMin(minuteOf(c.now.getTime()));
      }
    }, 60_000);
    onCleanup(() => {
      ac.abort();
      stop();
      clearInterval(tick);
    });
    void init();
  });

  const useSuggest = () => {
    const sug = s.ctx()?.habits?.history.suggestion;
    updatePrefs({ plan: { availability: sug?.windows ?? DEFAULT_WINDOWS } });
  };

  const flow = (c: Ctx) => (
    <>
      <Head s={s} c={c} />
      <Note c={c} />
    </>
  );

  return (
    <>
      <div class="page plan" data-plan data-view={s.view()} ref={(el) => (s.refs.root = el)} onClick={onHelperClick}>
        <Switch>
          <Match when={s.status() === "loading"}>
            <Skeleton />
          </Match>
          <Match when={s.status() === "gate"}>{raw(gate())}</Match>
          <Match when={s.status() === "error"}>
            <a class="back" href={ROUTES.today}>
              {raw(icon("arrow-left"))}Today
            </a>
            <header class="plan-head">
              <div>
                <h1>Plan</h1>
              </div>
            </header>
            {raw(errorPanel("Couldn't build the plan", s.failure()))}
          </Match>
          <Match when={s.status() === "ready" && !hasWindows()}>
            <Show when={s.ctx()} keyed>
              {(c) => <EmptyState s={s} c={c} useSuggest={useSuggest} />}
            </Show>
          </Match>
          <Match when={s.status() === "ready"}>
            <div class="plan-flow">
              <Show when={s.ctx()} keyed>
                {flow}
              </Show>
              <section class="week-sec" aria-labelledby="cal-h">
                <Toolbar s={s} />
                <div class="cal-split" classList={{ "insp-open": !!s.pop() && !s.popLeaving() }}>
                  <div class="cal-main" ref={(el) => (s.refs.calMain = el)}>
                    <Show when={s.view() === "week"}>
                      <Week s={s} mover={mover} ghost={(el) => (ghost = el)} tip={(el) => (tip = el)} />
                    </Show>
                    <Show when={monthKey()} keyed>
                      {(k) => <Month s={s} c={k.c} whole={k.whole} />}
                    </Show>
                    <Show when={s.ctx()} keyed>
                      {(c) => <Agenda s={s} c={c} />}
                    </Show>
                  </div>
                  <Inspector s={s} />
                </div>
                <div class="legend cal-legend" aria-label="Session mix colors">
                  {LEGEND.map(([bg, label]) => (
                    <span>
                      <i style={{ background: bg }} />
                      {label}
                    </span>
                  ))}
                  <span>
                    <i class="lg-check" />
                    Check-in
                  </span>
                  <span>
                    <i style={{ background: "var(--window)", "box-shadow": "inset 0 0 0 1px var(--window-edge)" }} />
                    Your windows
                  </span>
                  <Show when={hasBusy()}>
                    <span>
                      <i class="lg-busy" />
                      Busy (Google Calendar)
                    </span>
                  </Show>
                  <span class="hint">Drag a session, or focus it and press Space, to move it. Day menu (…) takes a day off</span>
                </div>
              </section>
              <Show when={s.ctx()} keyed>
                {(c) => (
                  <>
                    <div class="route">
                      <Road s={s} c={c} />
                      {c.plan.prep?.topics.length || c.plan.dream?.topics.length ? null : <Forecast c={c} />}
                    </div>
                    <You c={c} />
                  </>
                )}
              </Show>
            </div>
          </Match>
        </Switch>
        <DayMenu s={s} />
      </div>
      <Drawer s={s} />
      <Show when={s.change()} keyed>
        {(o) => <ChangeDialog s={s} {...o} />}
      </Show>
    </>
  );
}
