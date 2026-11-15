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
