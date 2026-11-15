// The Worker's account API (worker/README.md). Every call is same-origin with the
// session cookie. Without a Worker (astro preview, offline) the app is simply signed out.
import { DEFAULT_PREFS, readPrefs, validWindows, type Prefs } from "./prefs";
import type { Availability } from "./types";

export type Provider = "github" | "google" | "email";

export interface ServerSettings {
  theme: "system" | "light" | "dark";
  editor_keymap: "standard" | "vim";
  editor_font_size: number;
  new_per_day: number;
  interview_date: string | null;
  target_companies: string[];
  reminders: boolean;
  public_profile: boolean;
  daily_minutes: number;
  session_minutes: number;
  availability: Availability[];
  days_off: string[];
  reminder_minutes: number | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: number;
}

export interface Me {
  user: User;
  providers: Provider[];
  settings: ServerSettings;
}

export interface SessionInfo {
  id: string;
  created_at: number;
  expires_at: number;
  user_agent: string;
  current: boolean;
}

export interface PublicProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  summary: { streak: number; mastered: number; solved: number; heatmap: Record<string, number> } | null;
  updated_at: number | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ME_CACHE = "myleet:me";
const RETURN_KEY = "myleet:return";

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  const res = await fetch(path, { credentials: "include", ...init, headers });
  const json = res.headers.get("content-type")?.includes("application/json");
  if (!res.ok) {
    const body = json ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  if (!json) throw new ApiError(404, "no account API here");
  return (await res.json()) as T;
}

function cache(me: Me | null): void {
  try {
    if (me) localStorage.setItem(ME_CACHE, JSON.stringify(me));
    else localStorage.removeItem(ME_CACHE);
  } catch {
    // Storage blocked: the shell just renders signed out until the fetch answers.
  }
}

/** Last known account, for painting the shell before `/api/me` answers. */
export function cachedMe(): Me | null {
  try {
    const v = localStorage.getItem(ME_CACHE);
    return v ? (JSON.parse(v) as Me) : null;
  } catch {
    return null;
  }
}

let mePromise: Promise<Me | null> | undefined;

/**
 * The signed-in account, or null. A 401 signs out; a network failure keeps the cached
 * account (offline), so the shell does not flip to signed out on a train.
 */
export function fetchMe(force = false): Promise<Me | null> {
  if (force || !mePromise) {
    mePromise = api<Me>("/api/me")
      .then((me) => (cache(me), me))
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          cache(null);
          return null;
        }
        return cachedMe();
      });
  }
  return mePromise;
}

export async function patchMe(body: {
  username?: string;
  display_name?: string | null;
  settings?: Partial<ServerSettings>;
}): Promise<Me> {
  const me = await api<Me>("/api/me", { method: "PATCH", body: JSON.stringify(body) });
  cache(me);
  mePromise = Promise.resolve(me);
  return me;
}

export async function signOut(): Promise<void> {
  try {
    await api<void>("/api/auth/logout", { method: "POST" });
  } finally {
    cache(null);
    mePromise = Promise.resolve(null);
  }
}

export const sendMagicLink = (email: string): Promise<{ sent: boolean }> =>
  api("/api/auth/email", { method: "POST", body: JSON.stringify({ email }) });

/** Leaves for the provider; the Worker sends the browser back to `/`, and we return here. */
export function startOAuth(provider: "github" | "google", returnTo = location.pathname + location.search): void {
  rememberReturn(returnTo);
  location.assign(`/api/auth/${provider}`);
}

export function rememberReturn(path: string): void {
  try {
    sessionStorage.setItem(RETURN_KEY, path.replace(/[?&]auth(_error)?=[^&]*/g, ""));
  } catch {
    // No session storage: the user lands on the home page instead.
  }
}

export function takeReturn(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

export const listSessions = (): Promise<{ sessions: SessionInfo[] }> => api("/api/sessions");
export const revokeSession = (id: string): Promise<void> =>
  api(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
export async function deleteAccount(): Promise<void> {
  await api<void>("/api/me", { method: "DELETE" });
  cache(null);
  mePromise = Promise.resolve(null);
}
export const exportUrl = "/api/me/export";

/** Stores the plan for the calendar feed; an identical plan writes nothing server-side. */
export const putPlan = (plan: unknown): Promise<{ changed: boolean; updated_at: number }> =>
  api("/api/plan", { method: "PUT", body: JSON.stringify({ plan }) });

export const fetchProfile = (username: string): Promise<PublicProfile> =>
  api(`/api/u/${encodeURIComponent(username)}`);

/** Sign-in failure reasons the Worker puts in `?auth_error=`. */
export const AUTH_ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled at the provider. Try again or use another method.",
  state: "That sign-in took too long or was opened twice. Start it again.",
  email: "That account has no verified email address. Verify one with the provider, or use another method.",
  link: "That sign-in link has expired or was already used. Links work once, for 15 minutes.",
  upstream: "The provider didn't answer. Try again in a minute, or use another method.",
};

// ---- settings mapping (theme stays device-local) ----

export function toServer(p: Prefs): Partial<ServerSettings> {
  return {
    editor_keymap: p.editor.keymap,
    editor_font_size: p.editor.fontSize,
    new_per_day: p.newPerDay,
    interview_date: p.plan.interviewDate,
    target_companies: p.plan.companies,
    reminders: p.reminders.on,
    public_profile: p.publicProfile,
    daily_minutes: p.plan.dailyMinutes ?? 60,
    session_minutes: p.plan.sessionMinutes,
    availability: validWindows(p.plan.availability),
    days_off: p.plan.daysOff,
    reminder_minutes: p.plan.reminderMinutes,
  };
}

/** The account's values as a prefs patch. */
export function fromServer(s: ServerSettings, base: Prefs = readPrefs()) {
  return {
    editor: { ...base.editor, keymap: s.editor_keymap, fontSize: s.editor_font_size },
    newPerDay: s.new_per_day,
    reminders: { ...base.reminders, on: s.reminders },
    publicProfile: s.public_profile,
    plan: {
      ...base.plan,
      interviewDate: s.interview_date,
      companies: s.target_companies,
      dailyMinutes: s.daily_minutes ?? base.plan.dailyMinutes,
      sessionMinutes: s.session_minutes ?? base.plan.sessionMinutes,
      availability: s.availability ?? base.plan.availability,
      daysOff: s.days_off ?? base.plan.daysOff,
      reminderMinutes: s.reminder_minutes === undefined ? base.plan.reminderMinutes : s.reminder_minutes,
    },
  } satisfies Partial<Prefs>;
}

/** True when the account still has the Worker's default settings (a fresh account). */
export function isDefaultServer(s: ServerSettings): boolean {
  const d = toServer(DEFAULT_PREFS);
  return (
    s.editor_keymap === d.editor_keymap &&
    s.new_per_day === d.new_per_day &&
    s.interview_date === null &&
    s.target_companies.length === 0 &&
    !s.public_profile &&
    !s.reminders &&
    (s.availability?.length ?? 0) === 0 &&
    (s.days_off?.length ?? 0) === 0
  );
}

export function initials(me: Pick<User, "display_name" | "username" | "email">): string {
  const name = me.display_name?.trim() || me.username || me.email;
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
