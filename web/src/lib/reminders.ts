// Opt-in daily reminder, scheduled locally while a myleet tab (or the installed app) is
// open. Never fires on a day with a solve, and at most once a day.
import { localDay } from "./streak";

const LAST = "myleet:reminded";

export type ReminderSupport = "granted" | "denied" | "default" | "unsupported";

export function reminderSupport(): ReminderSupport {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Asks for permission; call only from the learner's click. */
export async function requestReminderPermission(): Promise<ReminderSupport> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
}

/**
 * Milliseconds until the reminder should fire, or null for "not today".
 * `time` is `HH:MM` local; a reminder already past today fires now (0) if still unsent.
 */
export function reminderDelay(now: Date, time: string, solvedToday: boolean, lastSent: string | null): number | null {
  const today = localDay(now);
  if (solvedToday || lastSent === today) return null;
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  // Past bedtime it is too late to help; skip rather than buzz at midnight.
  if (now.getHours() >= 23) return null;
  return Math.max(0, at.getTime() - now.getTime());
}

export function lastReminder(): string | null {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
}

export async function sendReminder(body: string): Promise<void> {
  try {
    localStorage.setItem(LAST, localDay());
  } catch {
    // Might repeat later today; harmless.
  }
  const opts: NotificationOptions = { body, icon: "/icons/icon-192.png", badge: "/icons/icon-mono.png", tag: "myleet-daily" };
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification("myleet", opts);
  else new Notification("myleet", opts);
}

export interface PlannedSession {
  start_ms: number;
  title: string;
  minutes: number;
}

/** `HH:MM` inside the quiet range, which may wrap past midnight (23:00 to 08:00). */
export function inQuiet(d: Date, from: string, to: string): boolean {
  const m = d.getHours() * 60 + d.getMinutes();
  const [fh = 0, fm = 0] = from.split(":").map(Number);
  const [th = 0, tm = 0] = to.split(":").map(Number);
  const a = fh * 60 + fm;
  const b = th * 60 + tm;
  if (a === b) return false;
  return a < b ? m >= a && m < b : m >= a || m < b;
}

/**
 * The next session reminder: `lead` minutes before a session still ahead, never inside
 * the quiet hours, once per session (`sent` holds the start times already reminded).
 */
export function nextSessionReminder(
  now: Date,
  sessions: PlannedSession[],
  o: { lead: number; quietFrom: string; quietTo: string; sent: number[] },
): { delay: number; key: number; body: string } | null {
  for (const s of [...sessions].sort((a, b) => a.start_ms - b.start_ms)) {
    if (s.start_ms <= now.getTime() || o.sent.includes(s.start_ms)) continue;
    const at = new Date(s.start_ms - o.lead * 60_000);
    if (inQuiet(at, o.quietFrom, o.quietTo)) continue;
    const time = new Date(s.start_ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
    const len = s.minutes < 60 ? `${s.minutes} min` : s.minutes % 60 ? `${Math.floor(s.minutes / 60)} h ${s.minutes % 60}` : `${s.minutes / 60} h`;
    return { delay: Math.max(0, at.getTime() - now.getTime()), key: s.start_ms, body: `Session at ${time}: ${s.title}. About ${len}.` };
  }
  return null;
}
