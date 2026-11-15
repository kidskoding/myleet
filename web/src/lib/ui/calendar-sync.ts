// "Add your plan to your calendar": the private ICS feed from the Worker (one way,
// refreshed on the calendar's schedule). Provider buttons are plain text with a neutral
// calendar icon: Google, Apple and Microsoft marks are only used under their brand
// terms, which this app doesn't hold.
import { ApiError, cachedMe, calendarStatus, makeCalendarLink, turnOffCalendarLink, type CalendarLinks, type CalendarStatus } from "../account";
import { readPrefs } from "../prefs";
import { html, render, type SafeHtml } from "./html";
import { icon } from "./icons";
import { closeDialog, confirmDialog, openDialog, toast } from "./overlay";

export type SyncView = "loading" | "signed-out" | "offline" | "none" | "active" | "error";

export interface SyncState {
  view: SyncView;
  status: CalendarStatus | null;
  /** Shown once: present only right after the link was made in this dialog. */
  links: CalendarLinks | null;
  confirm: "rotate" | null;
  busy: boolean;
  copied: boolean;
}

export interface EventPreview {
  summary: string;
  when: string;
  description: string;
}

/** The first VEVENT of an iCalendar text: the same template the Worker serves. */
export function eventPreview(ics: string): EventPreview | null {
  const lines = ics.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const start = lines.indexOf("BEGIN:VEVENT");
  if (start < 0) return null;
  const get = (k: string) => {
    const l = lines.slice(start).find((x) => x.startsWith(`${k}:`) || x.startsWith(`${k};`));
    return l ? l.slice(l.indexOf(":") + 1) : "";
  };
  const unescape = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
  const at = (v: string) => {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    return m ? new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!)) : null;
  };
  const a = at(get("DTSTART"));
  const b = at(get("DTEND"));
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const when = a && b ? `${a.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${t(a)} to ${t(b)}` : "";
  return { summary: unescape(get("SUMMARY")), when, description: unescape(get("DESCRIPTION")) };
}

/** `webcal://host/api/calendar/k7Qm…T2x.ics`: the middle of the secret elided on screen. */
export function elide(url: string): string {
  const m = url.match(/^(.*\/)([^/]+)(\.ics)$/);
  if (!m || (m[2] ?? "").length <= 10) return url;
  return `${m[1]}${m[2]!.slice(0, 4)}…${m[2]!.slice(-3)}${m[3]}`;
}

const ago = (ms: number) => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 2) return "just now";
  if (mins < 90) return `${mins} minutes ago`;
  const h = Math.round(mins / 60);
  if (h < 36) return `${h} hours ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const PROVIDERS = [
  { id: "google", label: "Google Calendar", sub: "Opens Google to subscribe" },
  { id: "apple", label: "Apple Calendar", sub: "Mac, iPhone, iPad (webcal)" },
  { id: "outlook", label: "Outlook", sub: "Outlook on the web" },
  { id: "copy", label: "Copy link", sub: "Any other calendar app" },
] as const;

export function renderSync(s: SyncState, preview: EventPreview | null): SafeHtml {
  const close = html`<button type="button" class="icon-btn" data-sync-close aria-label="Close (Esc)">${icon("x")}</button>`;
  if (s.view === "signed-out") {
    return html`<div class="dlg-head"><h2 id="sync-title">Add your plan to your calendar</h2>${close}</div>
      <div class="dlg-body"><p>Calendar links are served from your account, so your calendar can fetch updates while this tab is closed. Sign in to make one. Your plan and progress stay on this device until you do.</p></div>
      <div class="dlg-actions"><button type="button" class="btn btn-ghost" data-sync-close>Not now</button><button type="button" class="btn btn-primary" data-signin data-sync-signin>Sign in to add</button></div>`;
  }
  const offline = s.view === "offline";
  const alarm = readPrefs().plan.reminderMinutes;
  const tiles = html`<div class="prov">${PROVIDERS.map(
    (p) =>
      html`<button type="button" data-provider="${p.id}" ${offline || s.busy || s.view === "loading" ? "disabled" : ""}><span class="pi">${icon(p.id === "copy" ? "link" : "calendar")}</span><strong>${p.id === "copy" && s.copied ? "Copied" : p.label}</strong><small>${offline ? "Available when you're online" : p.sub}</small></button>`,
  )}</div>`;
  const linkRow = s.links
    ? html`<div class="linkrow"><input class="input" readonly value="${elide(s.links.webcal_url)}" aria-label="Private calendar link (shown once)" /><button type="button" class="btn btn-secondary" data-provider="copy">${icon("copy")}Copy</button></div>
      <p class="fineprint">This link is shown once. Keep it in your calendar; to see a link again, rotate it.</p>`
    : s.view === "active"
      ? html`<p class="sync-active">${icon("circle-check")}<span><b>Your calendar link is on.</b> It was made ${s.status?.created_at ? new Date(s.status.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "earlier"} and was shown once. To add it to another calendar, rotate it for a new one.</span></p>`
      : "";
  const confirm =
    s.confirm === "rotate"
      ? html`<div class="rotate-confirm" role="alert"><span>The old link stops working. Calendars using it stop updating until you add the new one.</span><button type="button" class="btn btn-secondary btn-sm" data-sync-rotate-ok>Rotate link</button><button type="button" class="btn btn-ghost btn-sm" data-sync-rotate-cancel>Cancel</button></div>`
      : "";
  const facts = html`<div class="howto">
    <div>${icon("arrow-right-left")}<span><b>One way.</b> Changes in myleet reach your calendar. Moving an event in your calendar doesn't move the session here.</span></div>
    <div>${icon("refresh")}<span><b>It refreshes on the calendar's schedule.</b> Apple Calendar lets you choose how often. Google can take several hours to show a change.</span></div>
    <div>${icon("bell-off")}<span><b>Google doesn't play alarms from subscribed calendars.</b> Turn on notifications for this calendar in Google, or use browser reminders from myleet.</span></div>
    <div>${icon("lock")}<span><b>The link is private.</b> Anyone with it can see your session times and problem titles, never your code or results. Rotate it if it leaks.</span></div>
  </div>`;
  const evt = preview
    ? html`<div class="evt"><div class="et">${preview.summary}</div><div class="em">${icon("clock-3")}${preview.when}</div>${
        alarm ? html`<div class="em">${icon("bell")}Alarm ${alarm} min before (calendar alarms are on in Settings)</div>` : ""
      }<pre>${preview.description}</pre></div>`
    : html`<div class="evt"><p class="text-muted text-small">No sessions are planned yet. Once there are, each one shows up like this.</p></div>`;
  const status = s.status?.plan_updated_at
    ? `Plan sent to your account ${ago(s.status.plan_updated_at)}`
    : s.status?.enabled
      ? "Your plan goes to your account with the next sync"
      : "";
  return html`<div class="dlg-head"><div><h2 id="sync-title">Add your plan to your calendar</h2><p class="sync-lede">Each session shows up as an event in the calendar you already use, and moves when the plan changes.</p></div>${close}</div>
    <div class="sync-grid">
      <div>${s.view === "error" ? html`<p class="sync-error" role="alert">${icon("circle-alert")}Couldn't reach your account. Your plan is safe on this device. Try again in a moment.</p>` : ""}${tiles}${linkRow}${confirm}${facts}</div>
      <div><p class="evt-cap">How a session looks in your calendar</p>${evt}<p class="fineprint">Titles update if the plan changes. Days off have no events.</p></div>
    </div>
    <div class="sync-foot">${
      s.status?.enabled || s.links
        ? html`<button type="button" class="btn btn-ghost btn-sm" data-sync-rotate ${offline || s.busy ? "disabled" : ""}>${icon("rotate-ccw")}Rotate link</button><button type="button" class="btn btn-quiet-danger btn-sm" data-sync-off ${offline || s.busy ? "disabled" : ""}>Turn off link</button>`
        : ""
    }<span class="text-muted">${status}</span><button type="button" class="btn btn-primary" data-sync-close>Done</button></div>`;
}

let dlg: HTMLDialogElement | null = null;

/** Opens the dialog. `ics` is a calendar text for the next session (trainer.planIcs). */
export async function openCalendarSync(ics: () => string | null): Promise<void> {
  const s: SyncState = { view: "loading", status: null, links: null, confirm: null, busy: false, copied: false };
  if (!dlg?.isConnected) {
    dlg = document.createElement("dialog");
    dlg.className = "dlg sync-dlg";
    dlg.setAttribute("aria-labelledby", "sync-title");
    document.body.append(dlg);
  }
  const d = dlg;
  let preview: EventPreview | null = null;
  try {
    const text = ics();
    preview = text ? eventPreview(text) : null;
  } catch {
    preview = null;
  }
  const draw = () => {
    render(d, renderSync(s, preview));
    d.classList.toggle("narrow", s.view === "signed-out");
  };
  if (!cachedMe()) s.view = "signed-out";
  else if (!navigator.onLine) s.view = "offline";
  draw();
  openDialog(d);
  if (s.view === "loading") {
    try {
      s.status = await calendarStatus();
      s.view = s.status.enabled ? "active" : "none";
    } catch (e) {
      s.view = e instanceof ApiError && e.status === 401 ? "signed-out" : "error";
    }
    draw();
  }

  const make = async (): Promise<CalendarLinks | null> => {
    s.busy = true;
    draw();
    try {
      s.links = await makeCalendarLink();
      s.status = { enabled: true, created_at: s.links.created_at, plan_updated_at: s.status?.plan_updated_at ?? null };
      s.view = "active";
      return s.links;
    } catch {
      s.view = "error";
      return null;
    } finally {
      s.busy = false;
      s.confirm = null;
      draw();
    }
  };

  d.onclick = async (e) => {
    const t = e.target as Element;
    if (t === d) return;
    const prov = t.closest<HTMLElement>("[data-provider]")?.dataset.provider;
    if (t.closest("[data-sync-close]") || t.closest("[data-sync-signin]")) return closeDialog(d);
    if (t.closest("[data-sync-rotate]")) {
      s.confirm = "rotate";
      return draw();
    }
    if (t.closest("[data-sync-rotate-cancel]")) {
      s.confirm = null;
      return draw();
    }
    if (t.closest("[data-sync-rotate-ok]")) {
      if (await make()) toast("New link made. The old one has stopped working.");
      return;
    }
    if (t.closest("[data-sync-off]")) {
      const ok = await confirmDialog({
        title: "Turn off the calendar link?",
        body: "Calendars using it stop updating and the events disappear on their next refresh. You can make a new link any time.",
        confirm: "Turn off link",
        danger: true,
      });
      if (!ok) return;
      try {
        await turnOffCalendarLink();
        s.links = null;
        s.status = s.status ? { ...s.status, enabled: false } : null;
        s.view = "none";
        toast("Calendar link turned off.");
      } catch {
        s.view = "error";
      }
      return draw();
    }
    if (!prov) return;
    if (!s.links && s.view === "active") {
      s.confirm = "rotate";
      return draw();
    }
    // A blank tab opened inside the click keeps popup blockers happy while the link is made.
    const tab = !s.links && (prov === "google" || prov === "outlook") ? window.open("about:blank", "_blank") : null;
    const links = s.links ?? (await make());
    if (!links) {
      tab?.close();
      return;
    }
    if (prov === "copy") {
      await navigator.clipboard?.writeText(links.https_url).catch(() => undefined);
      s.copied = true;
      draw();
      toast("Link copied. Paste it where your calendar asks for a URL.");
    } else if (prov === "apple") {
      location.href = links.webcal_url;
    } else {
      const url = prov === "google" ? links.google_url : links.outlook_url;
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener");
    }
  };
}
