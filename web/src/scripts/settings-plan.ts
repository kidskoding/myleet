// Settings: "Plan and schedule" (#plan) and "Reminders" (#reminders). They write the same
// settings record as the Plan page's panel and onboarding, so all three stay in sync.
import { cachedMe, calendarStatus } from "../lib/account";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { planSettings, readPrefs, updatePrefs } from "../lib/prefs";
import { readEvents } from "../lib/progress";
import { reminderSupport, requestReminderPermission } from "../lib/reminders";
import { ROUTES } from "../lib/routes";
import { fmtM, LEAD_TIMES, SESSION_LENGTHS, step, WEEKDAY_STEPS, WEEKEND_STEPS, windowsSummary } from "../lib/schedule";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import { mountAvailability, type AvailabilityEditor } from "../lib/ui/availability";
import { openCalendarSync } from "../lib/ui/calendar-sync";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { toast } from "../lib/ui/overlay";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
let cat: LoadedCatalog | null = null;
let trainer: TrainerApi | null = null;
let offEditor: AvailabilityEditor | null = null;
let drawerEditor: AvailabilityEditor | null = null;
let calText = "";

const slugOf = (id: string) => id.replace(/^\d+_/, "");

/** Techniques the chosen companies' sets lean on, by tracked problems in them. */
function lean(c: LoadedCatalog, slugs: string[]): { title: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const pl of c.catalog.playlists.filter((p) => slugs.includes(slugOf(p.id)))) {
    for (const e of pl.entries) {
      const p = e.problem !== null && e.problem !== undefined ? c.catalog.problems[e.problem] : undefined;
      const t = p ? c.catalog.modules[p.module]?.techniques[p.technique]?.title : undefined;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([title, n]) => ({ title, n }))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 5);
}

const stepper = (k: string, v: number, steps: number[], label: string): SafeHtml =>
  html`<span class="stepper" role="group" aria-label="${label}"><button type="button" data-pstep="${k}" data-by="-1" aria-label="Less ${label.toLowerCase()}" ${v <= (steps[0] ?? 0) ? "disabled" : ""}>${icon("minus")}</button><output>${fmtM(v)}</output><button type="button" data-pstep="${k}" data-by="1" aria-label="More ${label.toLowerCase()}" ${v >= (steps.at(-1) ?? 0) ? "disabled" : ""}>${icon("plus")}</button></span>`;

function planGroup(): SafeHtml {
  const p = readPrefs().plan;
  const wd = p.dailyMinutes ?? 60;
  const we = p.weekendMinutes ?? wd;
  const chosen = p.companies.map((s) => ({ slug: s, title: cat?.catalog.playlists.find((x) => slugOf(x.id) === s)?.title ?? s }));
  const others = (cat?.catalog.playlists ?? []).filter((x) => !p.companies.includes(slugOf(x.id)));
  const leans = cat ? lean(cat, p.companies) : [];
  const max = Math.max(1, ...leans.map((l) => l.n));
  return html`
    <div class="row"><div><label class="lbl" for="set-iv">Interview date</label><div class="desc">The plan builds toward it. Without one it covers 4 weeks at a time.</div></div>
      <div class="ctl"><input class="input" id="set-iv" type="date" style="width:170px" value="${p.interviewDate ?? ""}" data-iv /><button type="button" class="btn btn-ghost btn-sm" data-no-date aria-pressed="${p.interviewDate ? "false" : "true"}">No date yet</button></div></div>
    <div class="row avail-row"><div><div class="lbl" id="co-l">Target companies</div><div class="desc">Their sets decide which techniques the plan leans on. Curated practice sets, not actual interview questions.</div></div>
      <div class="ctl wide" aria-labelledby="co-l"><div class="co-chips">${chosen.map(
        (c) => html`<span class="co-chip">${c.title}<button type="button" data-co-remove="${c.slug}" aria-label="Remove ${c.title}">${icon("x")}</button></span>`,
      )}<label class="co-add"><span class="visually-hidden">Add a company</span><select class="input" data-co-add><option value="">Add a company</option>${others.map((o) => html`<option value="${slugOf(o.id)}">${o.title}</option>`)}</select></label></div>
      ${leans.length ? html`<div class="lean" aria-label="Techniques your companies lean on, by problem count in their sets">${leans.map((l) => html`<div><span>${l.title}</span><span class="bar" aria-hidden="true"><span style="width:${((l.n / max) * 100).toFixed(0)}%"></span></span><b>${l.n}</b></div>`)}</div>` : ""}</div></div>
    <div class="row"><div><div class="lbl">Practice windows</div><div class="desc" data-win-summary>${windowsSummary(p.availability)}</div></div>
      <div class="ctl"><button type="button" class="btn btn-secondary btn-sm" data-edit-windows>Edit windows</button></div></div>
    <div class="row"><div><div class="lbl" id="sl-l">Session length</div><div class="desc">The longest single session. Longer days split into two.</div></div>
      <div class="ctl"><div class="seg" role="group" aria-labelledby="sl-l">${SESSION_LENGTHS.map((m) => html`<button type="button" data-psession="${m}" aria-pressed="${p.sessionMinutes === m ? "true" : "false"}">${fmtM(m)}</button>`)}</div></div></div>
    <div class="row"><div><div class="lbl">Daily time</div><div class="desc">A cap. Reviews always fit first; new problems fill what's left.</div></div>
      <div class="ctl daily"><span class="text-secondary">Weekdays</span>${stepper("wd", wd, WEEKDAY_STEPS, "Weekday time")}<span class="text-secondary">Weekends</span>${stepper("we", we, WEEKEND_STEPS, "Weekend time")}</div></div>
    <div class="row avail-row"><div><div class="lbl">Days off</div><div class="desc">Nothing is planned on these days, and nothing piles up after them.</div></div>
      <div class="ctl wide" data-off-editor></div></div>`;
}

function reminderGroup(): SafeHtml {
  const p = readPrefs();
  const s = reminderSupport();
  const status = s === "granted" ? html`<span class="status-ok">${icon("check")}Allowed</span>` : s === "denied" ? html`<span class="status-off">Blocked</span>` : s === "unsupported" ? html`<span class="status-off">Not available here</span>` : "";
  const note =
    p.reminders.on && s === "denied"
      ? "Notifications are blocked for this site, so reminders can't show. Allow them in your browser's site settings (the icon left of the address), then come back. Reminders stay on and start once allowed."
      : s === "unsupported"
        ? "This browser can't show notifications here. On iPhone and iPad, add myleet to your Home Screen first (Share, then Add to Home Screen), then turn reminders on from the app."
        : "";
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
  const hourLabel = (v: string) => {
    const h = Number(v.slice(0, 2));
    return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
  };
  const me = cachedMe();
  return html`
    <div class="row"><div><label class="lbl" for="rm-lead">Remind me</label><div class="desc">Before each planned session. Never when today's session is already done.</div></div>
      <div class="ctl"><select class="input" id="rm-lead" style="width:160px" data-lead>${LEAD_TIMES.map((m) => html`<option value="${m}" ${p.reminders.lead === m ? "selected" : ""}>${fmtM(m)} before</option>`)}</select></div></div>
    <div class="row"><div><div class="lbl" id="bn-l">Browser notifications</div><div class="desc">"Session at 9 pm: 3 reviews, 1 new. About 1 h." On days with no plan, one reminder at ${hourLabel(p.reminders.time)}.</div></div>
      <div class="ctl">${status}<label class="switch"><input type="checkbox" data-browser ${p.reminders.on ? "checked" : ""} ${s === "unsupported" ? "disabled" : ""} aria-labelledby="bn-l" /></label></div></div>
    ${note ? html`<div class="row"><div class="note warn" style="grid-column:1/-1">${icon("bell")}<span>${note}</span></div></div>` : ""}
    <div class="row"><div><div class="lbl" id="ca-l">Calendar alarms</div><div class="desc">Adds an alarm to each event in your calendar link. Google Calendar ignores alarms in subscribed calendars, so set notifications for the calendar in Google instead.</div></div>
      <div class="ctl"><label class="switch"><input type="checkbox" data-cal-alarm ${p.plan.reminderMinutes !== null ? "checked" : ""} aria-labelledby="ca-l" /></label></div></div>
    <div class="row"><div><div class="lbl" id="qh-l">Quiet hours</div><div class="desc">No notifications in this range, even if a session is planned.</div></div>
      <div class="ctl" role="group" aria-labelledby="qh-l"><select class="input" style="width:110px" aria-label="Quiet from" data-quiet="quietFrom">${hours.map((h) => html`<option value="${h}" ${p.reminders.quietFrom === h ? "selected" : ""}>${hourLabel(h)}</option>`)}</select><span class="text-muted">to</span><select class="input" style="width:110px" aria-label="Quiet until" data-quiet="quietTo">${hours.map((h) => html`<option value="${h}" ${p.reminders.quietTo === h ? "selected" : ""}>${hourLabel(h)}</option>`)}</select></div></div>
    <div class="row"><div><div class="lbl">Calendar link</div><div class="desc" data-cal-status>${me ? calText || "Checking…" : "Sign in to make one: calendar links are served from your account."}</div></div>
      <div class="ctl"><button type="button" class="btn btn-secondary btn-sm" data-cal-manage>${me ? "Manage" : "Add to calendar"}</button></div></div>`;
}

function paint(): void {
  const planEl = $("[data-plan-settings]");
  const remEl = $("[data-reminder-settings]");
  if (planEl) {
    offEditor?.destroy();
    render(planEl, planGroup());
    const host = planEl.querySelector<HTMLElement>("[data-off-editor]");
    if (host) offEditor = mountAvailability(host, { sections: ["daysoff"], headings: false, id: "set-off" });
  }
  if (remEl) render(remEl, reminderGroup());
}

function openWindows(): void {
  const d = $("[data-av-drawer]");
  if (!d) return;
  render(
    d,
    html`<div class="dr-head"><div><h2 id="dr-h">When you practise</h2><p>Sessions only go inside these windows. Saved as you go.</p></div><button type="button" class="icon-btn" data-drawer-close aria-label="Close (Esc)">${icon("x")}</button></div>
    <div data-av-host style="margin-top:var(--space-5)"></div>
    <div class="dr-foot"><span>Saved as you go</span><a class="link text-small" href="${ROUTES.plan}">Open the plan</a><button type="button" class="btn btn-secondary" data-drawer-close>Done</button></div>`,
  );
  d.hidden = false;
  const host = d.querySelector<HTMLElement>("[data-av-host]");
  let history = null;
  if (trainer) {
    void readEvents().then((ev) => {
      try {
        history = trainer?.habits(ev).history ?? null;
        drawerEditor?.refresh(history);
      } catch {
        // No dots or suggestion.
      }
    });
  }
  if (host) drawerEditor = mountAvailability(host, { sections: ["suggest", "presets", "paint", "session"], history, id: "set-av" });
  d.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
}

function closeWindows(): void {
  const d = $("[data-av-drawer]");
  if (!d || d.hidden) return;
  d.hidden = true;
  drawerEditor?.destroy();
  drawerEditor = null;
  $("[data-edit-windows]")?.focus();
}

async function refreshCalendar(): Promise<void> {
  if (!cachedMe() || !navigator.onLine) {
    calText = navigator.onLine ? "" : "Available when you're online.";
    return;
  }
  try {
    const s = await calendarStatus();
    calText = s.enabled
      ? `Active. Added ${s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "earlier"}${s.plan_updated_at ? `, plan sent ${new Date(s.plan_updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}.`
      : "Not set up. Each session can show up in the calendar you already use.";
  } catch {
    calText = "Couldn't check right now.";
  }
  const el = $("[data-cal-status]");
  if (el) el.textContent = calText;
}

async function openSync(): Promise<void> {
  const ev = await readEvents();
  await openCalendarSync(() => {
    if (!trainer) return null;
    const plan = trainer.plan(ev, planSettings());
    const next = plan.days.find((d) => d.sessions.length);
    if (!next) return null;
    return trainer.planIcs({ ...plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] }, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes });
  });
  void refreshCalendar();
}

function onClick(e: MouseEvent): void {
  if (!$("[data-plan-settings]")) return;
  const t = e.target as Element;
  const ps = t.closest<HTMLElement>("[data-pstep]");
  const sess = t.closest<HTMLElement>("[data-psession]");
  const rm = t.closest<HTMLElement>("[data-co-remove]");
  if (ps) {
    const p = readPrefs().plan;
    const dir = Number(ps.dataset.by) > 0 ? 1 : -1;
    if (ps.dataset.pstep === "wd") updatePrefs({ plan: { dailyMinutes: step(WEEKDAY_STEPS, p.dailyMinutes ?? 60, dir), weekendMinutes: p.weekendMinutes ?? p.dailyMinutes ?? 60 } });
    else updatePrefs({ plan: { weekendMinutes: step(WEEKEND_STEPS, p.weekendMinutes ?? p.dailyMinutes ?? 60, dir) } });
  } else if (sess) updatePrefs({ plan: { sessionMinutes: Number(sess.dataset.psession) } });
  else if (rm) updatePrefs({ plan: { companies: readPrefs().plan.companies.filter((c) => c !== rm.dataset.coRemove) } });
  else if (t.closest("[data-no-date]")) updatePrefs({ plan: { interviewDate: null } });
  else if (t.closest("[data-edit-windows]")) openWindows();
  else if (t.closest("[data-drawer-close]")) closeWindows();
  else if (t.closest("[data-cal-manage]")) void openSync();
}

async function onChange(e: Event): Promise<void> {
  if (!$("[data-plan-settings]")) return;
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.matches("[data-iv]")) updatePrefs({ plan: { interviewDate: el.value || null } });
  else if (el.matches("[data-co-add]") && el.value) updatePrefs({ plan: { companies: [...readPrefs().plan.companies, el.value] } });
  else if (el.matches("[data-lead]")) {
    const lead = Number(el.value);
    updatePrefs({ reminders: { lead }, plan: readPrefs().plan.reminderMinutes !== null ? { reminderMinutes: lead } : {} });
  } else if (el.matches("[data-quiet]")) updatePrefs({ reminders: { [el.dataset.quiet as "quietFrom" | "quietTo"]: el.value } });
  else if (el.matches("[data-cal-alarm]")) updatePrefs({ plan: { reminderMinutes: (el as HTMLInputElement).checked ? readPrefs().reminders.lead : null } });
  else if (el.matches("[data-browser]")) {
    const on = (el as HTMLInputElement).checked;
    if (on && reminderSupport() === "default") await requestReminderPermission();
    updatePrefs({ reminders: { on } });
    if (on && reminderSupport() === "granted") toast(`Reminders on: ${readPrefs().reminders.lead} min before each planned session.`);
  }
}

async function init(): Promise<void> {
  if (!$("[data-plan-settings]")) return;
  paint();
  [cat, trainer] = await Promise.all([loadCatalog().catch(() => null), loadTrainer().catch(() => null)]);
  await refreshCalendar();
  paint();
  if (location.hash === "#plan" || location.hash === "#reminders") $(location.hash)?.scrollIntoView();
}

document.addEventListener("click", onClick);
document.addEventListener("change", (e) => void onChange(e));
document.addEventListener("keydown", (e) => e.key === "Escape" && closeWindows());
document.addEventListener("astro:page-load", () => void init());
addEventListener("myleet:prefs", () => {
  const busy = $("[data-av-drawer]")?.contains(document.activeElement) || $("[data-off-editor]")?.contains(document.activeElement);
  if (!$("[data-plan-settings]") || busy) {
    const sum = $("[data-win-summary]");
    if (sum) sum.textContent = windowsSummary(readPrefs().plan.availability);
    return;
  }
  // Keep focus on the control that changed.
  const active = document.activeElement as HTMLElement | null;
  const key = active?.dataset.pstep ? `[data-pstep="${active.dataset.pstep}"][data-by="${active.dataset.by}"]` : active?.dataset.psession ? `[data-psession="${active.dataset.psession}"]` : null;
  paint();
  if (key) $(key)?.focus();
});
