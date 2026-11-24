import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { companyLogo } from "../../lib/company-logos";
import { topicName } from "../../lib/goals";
import { drawerLede, changePreview } from "../../lib/plan-copy";
import { pacingInterview, planSettings, readPrefs, updatePrefs } from "../../lib/prefs";
import { noteHref, ROUTES, sessionHref } from "../../lib/routes";
import { addDays, clock, DAY_SHORT, fmtM, minuteOf, span, weekdayIndex } from "../../lib/schedule";
import type { PlanSession } from "../../lib/types";
import { kbd, plural } from "../../lib/ui/bits";
import { mountAvailability } from "../../lib/ui/availability";
import { goalsOf, GOALS_ICON, mountGoalsEditor, planPatch } from "../../lib/ui/goals-editor";
import { icon } from "../../lib/ui/icons";
import { companyTitle } from "../../lib/ui/interviews";
import { closeDialog, openDialog, toast } from "../../lib/ui/overlay";
import { mixBar, reasonLine } from "../../lib/ui/personal";
import { changeLines, chosenRoadmap, dayName, interviewsOn, isMock, ivLabel, lenOf, longDay, mockDone, mockLink, moveTargets, rememberRoadmap, ROADMAPS, sameAims, short, startHref, type Draft } from "./model";
import { raw } from "./raw";
import type { PlanState } from "./state";

const close = (onClick: () => void): JSX.Element => (
  <button type="button" class="icon-btn" data-pop-close aria-label="Close (Esc)" onClick={onClick}>
    {raw(icon("x"))}
  </button>
);

function SessionPop(p: { s: PlanState; id: string; move: boolean }) {
  const hit = () => p.s.findSession(p.id);
  return (
    <Show when={hit()} keyed>
      {(h) => {
        const [d, ses] = h;
        const c = p.s.ctx()!;
        const a = minuteOf(ses.start_ms);
        const len = lenOf(ses);
        const isToday = d.date === c.plan.start && d.sessions[0] === ses;
        const done = isMock(ses) ? mockDone(ses) : null;
        const itemHref = (i: PlanSession["items"][number]) => (i.problem ? sessionHref(i.problem, d.date) : i.note ? noteHref(i.note) : i.kind === "mock" ? ROUTES.mock : ROUTES.today);
        return (
          <>
            <div class="pop-head">
              <div>
                <h3 id="pop-h">{longDay(d.date)}</h3>
                <p>
                  {span(a, a + len)}, about {fmtM(ses.minutes)}
                  {ses.moved_from ? `. Moved from ${dayName(ses.moved_from)}` : ""}
                </p>
              </div>
              {close(() => p.s.closePop())}
            </div>
            {raw(mixBar(ses.items, { tall: true }))}
            <ol class="items" aria-label="Why each problem is here">
              <For each={ses.items}>
                {(i) => (
                  <li class="item">
                    <a class="ti" href={itemHref(i)}>
                      {i.title}
                    </a>
                    <span class="m">{i.minutes}m</span>
                    {raw(reasonLine(i))}
                  </li>
                )}
              </For>
            </ol>
            <p class="pop-sum">Reviews come first, followed by your weakest technique and new topics. Time estimates use your usual solving time</p>
            {p.move ? (
              (() => {
                const targets = moveTargets(c, d, ses);
                return (
                  <div class="moveto">
                    <h4>Move to</h4>
                    {targets.length ? (
                      <ul>
                        {targets.map((t) => (
                          <li>
                            <button
                              type="button"
                              class="btn btn-ghost btn-sm"
                              onClick={() => {
                                p.s.closePop();
                                p.s.applyMove(ses.id, t.day.date, t.start);
                              }}
                            >
                              {DAY_SHORT[weekdayIndex(t.day.date)]} {short(t.day.date)}, {span(t.start, t.start + len)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p class="fineprint">No other window in the next week has room. Add one in Availability</p>
                    )}
                  </div>
                );
              })()
            ) : (
              <div class="pop-foot">
                <button type="button" class="btn btn-secondary btn-sm" onClick={() => p.s.openPop(ses.id, { move: true })}>
                  {raw(icon("move"))}Move
                </button>
                <button type="button" class="btn btn-ghost btn-sm" onClick={() => p.s.skipSession(ses.id)}>
                  Skip this session
                </button>
                {done ? (
                  <a class="btn btn-secondary btn-sm" href={`${ROUTES.mock}?r=${done.id}`}>
                    {raw(icon("check"))}See results
                  </a>
                ) : isMock(ses) ? (
                  <a class="btn btn-primary btn-sm" href={mockLink(ses)} data-start>
                    Start mock interview
                  </a>
                ) : isToday ? (
                  <a class="btn btn-primary btn-sm" href={startHref(ses, d.date)} data-start>
                    Start session {raw(kbd("s"))}
                  </a>
                ) : null}
              </div>
            )}
          </>
        );
      }}
    </Show>
  );
}

function DayPop(p: { s: PlanState; index: number }) {
  const c = p.s.ctx()!;
  const d = c.plan.days[p.index];
  if (!d) return null;
  const ivs = interviewsOn(c.plan, d.date);
  return (
    <>
      <div class="pop-head">
        <div>
          <h3 id="pop-h">{longDay(d.date)}</h3>
          <p>{d.off ? "Day off" : d.sessions.length ? `${fmtM(d.minutes)}, ${plural(d.sessions.length, "session")}` : "Nothing planned"}</p>
        </div>
        {close(() => p.s.closePop())}
      </div>
      {ivs.length ? (
        <ul class="day-ivs">
          {ivs.map((iv) => (
            <li>
              {raw(iv.company ? companyLogo(iv.company) : icon("flag"))}
              {ivLabel(iv)}
            </li>
          ))}
        </ul>
      ) : null}
      {d.sessions.length ? (
        <ol class="day-ses" aria-label="Sessions">
          {d.sessions.map((ses) => (
            <li>
              <button type="button" class="pd-ses" data-ses={ses.id} data-date={d.date} onClick={() => p.s.openPop(ses.id)}>
                <span class="t">
                  {clock(minuteOf(ses.start_ms))}, {fmtM(ses.minutes)}
                </span>
                <span class="h">{ses.title}</span>
                {raw(mixBar(ses.items))}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      <div class="pop-foot">
        <button type="button" class="btn btn-secondary btn-sm" onClick={() => p.s.goTo(p.index)}>
          {raw(icon("calendar-days"))}Open this week
        </button>
      </div>
    </>
  );
}

/** The inspector beside the calendar: a session's problems and why, or a month day's sessions. */
export function Inspector(p: { s: PlanState }) {
  return (
    <aside class="pop" data-pop role="dialog" aria-modal="false" aria-labelledby="pop-h" hidden={!p.s.pop()} classList={{ "is-leaving": p.s.popLeaving() }}>
      <div class="pop-in" ref={(el) => (p.s.refs.popInner = el)}>
        {(() => {
          const pp = p.s.pop();
          // Keyed on what is shown, so a different session or day renders fresh.
          if (!pp) return null;
          return pp.kind === "ses" ? <SessionPop s={p.s} id={pp.id} move={pp.move} /> : <DayPop s={p.s} index={pp.index} />;
        })()}
      </div>
    </aside>
  );
}

export function DayMenu(p: { s: PlanState }) {
  return (
    <Show when={p.s.menu()}>
      {(m) => {
        const day = m().day;
        const d = p.s.ctx()?.plan.days.find((x) => x.date === day);
        const shorter = readPrefs().plan.dayMinutes.some((x) => x.date === day);
        let first: HTMLButtonElement | undefined;
        onMount(() => first?.focus());
        const pick = (fn: () => void) => () => {
          p.s.setMenu(null);
          fn();
        };
        return (
          <div class="menu daymenu-pop" role="menu" style={{ left: `${m().left}px`, top: `${m().top}px` }}>
            <button type="button" role="menuitem" class="menu-item" ref={first} onClick={pick(() => p.s.toggleOff(day))}>
              {d?.off ? `Put ${dayName(day)} back` : `Take ${dayName(day)} off`}
            </button>
            <Show when={!d?.off}>
              <button type="button" role="menuitem" class="menu-item" onClick={pick(() => p.s.toggleShorter(day))}>
                {shorter ? `Back to the usual time on ${dayName(day)}` : "Shorter day: 30 min"}
              </button>
            </Show>
            <button type="button" role="menuitem" class="menu-item" data-act="avail" onClick={pick(() => p.s.openDrawer())}>
              Edit availability
            </button>
          </div>
        );
      }}
    </Show>
  );
}

function DrawerBody(p: { s: PlanState }) {
  let host: HTMLDivElement | undefined;
  let done: HTMLButtonElement | undefined;
  const history = p.s.ctx()?.habits?.history ?? null;
  let editor: ReturnType<typeof mountAvailability> | null = null;
  onMount(() => {
    if (host) p.s.setEditor((editor = mountAvailability(host, { history, id: "plan-av" })));
    done?.focus();
  });
  onCleanup(() => {
    editor?.destroy();
    p.s.setEditor(null);
  });
  return (
    <>
      <div class="dr-head">
        <div>
          <h2 id="dr-h">When do you want to practice?</h2>
          <p>{drawerLede(history)}</p>
        </div>
        <button type="button" class="icon-btn" data-drawer-close aria-label="Close (Esc)" ref={done} onClick={() => p.s.closeDrawer()}>
          {raw(icon("x"))}
        </button>
      </div>
      <div ref={host} />
      <div class="dr-foot">
        <span>Saved as you go</span>
        <button type="button" class="btn btn-secondary" data-drawer-close onClick={() => p.s.closeDrawer()}>
          Done
        </button>
      </div>
    </>
  );
}

export function Drawer(p: { s: PlanState }) {
  return (
    <aside class="drawer" data-av-drawer role="dialog" aria-modal="false" aria-labelledby="dr-h" hidden={p.s.drawer() === "closed"} classList={{ "is-leaving": p.s.drawer() === "leaving" }} ref={(el) => (p.s.refs.drawer = el)}>
      <Show when={p.s.drawer() !== "closed"}>
        <DrawerBody s={p.s} />
      </Show>
    </aside>
  );
}

/** "Your goals": the shared goals editor as a draft, so the change's cost shows before it applies. */
export function ChangeDialog(p: { s: PlanState; weekday?: number; focusDate?: boolean }) {
  const c = p.s.ctx()!;
  const prefs = readPrefs().plan;
  const start = goalsOf(prefs);
  const draft: Draft = { ...start, weekday: p.weekday ?? start.weekday, interviews: [...start.interviews], preset: null };
  const names = (slug: string | null) => companyTitle(c.cat.catalog.playlists, slug);
  const topic = (id: string) => topicName(c.cat.catalog, id);
  const moves = prefs.history.filter((h) => h.kind === "date").length;
  const [pressed, setPressed] = createSignal<string | null>(chosenRoadmap());
  const [previewText, setPreviewText] = createSignal("");
  const [canApply, setCanApply] = createSignal(false);
  let dlg: HTMLDialogElement | undefined;
  let goals: HTMLDivElement | undefined;
  let editor: { refresh(): void } | undefined;

  const settings = () => ({
    ...planSettings(),
    interviews: draft.interviews,
    interview_date: pacingInterview(draft.interviews, c.plan.start)?.date ?? null,
    target_companies: draft.companies,
    focus_topics: draft.focusTopics,
    daily_minutes: draft.weekday,
    weekend_minutes: draft.weekend,
  });
  const changed = () => changeLines(readPrefs().plan, draft, names, topic).length > 0 || !sameAims(draft.aims, start.aims);
  const preview = (): void => {
    if (!changed()) {
      setPreviewText("");
      return void setCanApply(false);
    }
    setCanApply(true);
    try {
      const after = c.t.plan(c.events, settings(), { now: c.now.getTime() });
      const who = names(pacingInterview(draft.interviews, c.plan.start)?.company ?? null);
      setPreviewText(changePreview({ before: c.plan, after, company: who, dateMoves: moves }).replace(/\.$/, ""));
    } catch {
      setPreviewText("Check the dates: each interview needs a real day");
    }
  };

  const choose = (days: number) => {
    const r = ROADMAPS.find((x) => x.days === days);
    if (!r) return;
    setPressed(String(days));
    const next = pacingInterview(draft.interviews, c.plan.start);
    const rest = draft.interviews.filter((i) => i !== next);
    draft.interviews = [...rest, { date: addDays(c.plan.start, r.days), company: next?.company ?? null }].sort((a, b) => a.date.localeCompare(b.date));
    Object.assign(draft, { weekday: r.weekday, weekend: r.weekend, preset: r.days, aims: draft.aims.includes("interview") ? draft.aims : ["interview", ...draft.aims] });
    editor?.refresh();
    preview();
  };

  const apply = () => {
    const before = readPrefs().plan;
    const lines = changeLines(before, draft, names, topic);
    if (draft.preset) rememberRoadmap(String(draft.preset));
    else if (lines.some((l) => l.kind === "date" || l.kind === "time")) rememberRoadmap("custom");
    p.s.budgetLabel("your plan");
    updatePrefs({
      plan: {
        ...planPatch({ aims: draft.aims, interviews: draft.interviews, companies: draft.companies, focusTopics: draft.focusTopics, weekday: draft.weekday, weekend: draft.weekend }),
        startedAt: draft.preset ? c.plan.start : (before.startedAt ?? c.plan.start),
        history: [...before.history, ...lines].slice(-50),
      },
    });
    closeDialog(dlg ?? null);
    toast("Goals updated. Everything you've done so far stays");
  };

  // Edit availability parks this dialog behind the drawer and brings it back, draft intact, on Done.
  const onClose = () => {
    if (dlg?.returnValue === "avail") {
      dlg.returnValue = "";
      p.s.afterDrawer(() => {
        openDialog(dlg ?? null);
        preview();
      });
      return p.s.openDrawer();
    }
    p.s.setChange(null);
    p.s.refs.root?.querySelector<HTMLElement>('[data-act="change"]')?.focus();
  };

  onMount(() => {
    if (goals)
      editor = mountGoalsEditor(goals, {
        id: "cp-goals",
        catalog: c.cat.catalog,
        get: () => draft,
        set: (g) => {
          Object.assign(draft, g);
          if (g.interviews || g.weekday !== undefined || g.weekend !== undefined) draft.preset = null;
          if (g.interviews || g.weekday !== undefined) setPressed(null);
          preview();
        },
        availability: () => closeDialog(dlg ?? null, "avail"),
      });
    openDialog(dlg ?? null);
    preview();
    (p.focusDate ? dlg?.querySelector<HTMLElement>("[data-iv-date]") : dlg?.querySelector<HTMLElement>("[data-cp-close]"))?.focus();
  });

  return (
    <dialog class="dlg change-dlg" aria-labelledby="cp-h" ref={dlg} on:close={onClose} on:keydown={(e) => e.stopPropagation()}>
      <div class="dlg-head">
        <h2 id="cp-h">
          {raw(icon(GOALS_ICON))}Your goals
        </h2>
        <button type="button" class="icon-btn" data-cp-close aria-label="Close" onClick={() => closeDialog(dlg ?? null)}>
          {raw(icon("x"))}
        </button>
      </div>
      <div class="cp-body">
        <p class="cp-intro">Your plan is built from these. Changes reshape the days ahead and keep everything you've already done. Moving one session on the calendar never changes them</p>
        <div ref={goals} />
        <h3 id="cp-fresh">Or start a fresh plan</h3>
        <div class="seg" role="group" aria-labelledby="cp-fresh">
          <For each={[...ROADMAPS]}>
            {(r) => (
              <button type="button" aria-pressed={pressed() === String(r.days)} onClick={() => choose(r.days)}>
                {r.label}
              </button>
            )}
          </For>
        </div>
        <Show when={prefs.history.length}>
          <details class="cp-history">
            <summary>
              {raw(icon("history"))}Goal history
            </summary>
            <ol>
              <For each={[...prefs.history].reverse()}>
                {(h) => (
                  <li>
                    <time datetime={h.date}>{short(h.date)}</time> {h.text}
                  </li>
                )}
              </For>
            </ol>
          </details>
        </Show>
      </div>
      <div class="cp-foot">
        <p class="cp-preview" aria-live="polite">
          {previewText()}
        </p>
        <div class="dlg-actions">
          <button type="button" class="btn btn-ghost" onClick={() => closeDialog(dlg ?? null)}>
            Keep my plan
          </button>
          <button type="button" class="btn btn-primary" disabled={!canApply()} onClick={apply}>
            Update my plan
          </button>
        </div>
      </div>
    </dialog>
  );
}
