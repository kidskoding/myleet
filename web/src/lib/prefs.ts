// Device preferences and the learner's plan. Local-first (localStorage); the account
// copy is pushed by lib/account.ts when signed in. Theme lives under its own key so the
// blocking head script can read it before first paint.
import { DEFAULT_ACCENT, flavorTokens, isAccent, type Accent, type Flavor, type NightFlavor } from "./flavors";
import type { Availability, Difficulty, PlanMove, PlanSettings } from "./types";

export type ThemePref = "system" | Flavor;
export type Goal = "internship" | "coop" | "newgrad";

export interface EditorPrefs {
  keymap: "standard" | "vim";
  fontSize: number;
  ligatures: boolean;
  minimap: boolean;
  indent: 2 | 4;
  formatOnSave: boolean;
  runOnSave: boolean;
}

export interface Plan {
  goal: Goal | null;
  /** Playlist slugs (`companySlug`). */
  companies: string[];
  /** `YYYY-MM-DD` in the learner's zone. */
  interviewDate: string | null;
  /** Minutes on weekdays (null until onboarding asks; the planner defaults to 60). */
  dailyMinutes: number | null;
  /** Saturday and Sunday budget; null = same as weekdays. Device-local for now. */
  weekendMinutes: number | null;
  /** One-day budgets ("Shorter day"). Device-local for now. */
  dayMinutes: { date: string; minutes: number }[];
  /** Sessions dragged to another window or day. Device-local for now. */
  moves: PlanMove[];
  /** Longest single sitting the planner schedules. */
  sessionMinutes: number;
  /** Weekly windows to plan sessions in; empty = around the hour you usually practice. */
  availability: Availability[];
  /** `YYYY-MM-DD` dates with nothing planned. */
  daysOff: string[];
  /** Calendar alarm before each planned session; null = none. */
  reminderMinutes: number | null;
  /** When the plan was made, `YYYY-MM-DD`. */
  startedAt: string | null;
  /** Finished or skipped onboarding. */
  onboarded: boolean;
}

export interface Prefs {
  reduceMotion: boolean;
  editor: EditorPrefs;
  newPerDay: number;
  /** Minutes per difficulty. */
  timeTargets: Record<Difficulty, number>;
  /**
   * Browser notifications: `lead` minutes before each planned session (or at `time` on a
   * day without one), never inside the quiet hours.
   */
  reminders: { on: boolean; time: string; lead: number; quietFrom: string; quietTo: string };
  publicProfile: boolean;
  plan: Plan;
}

export const THEME_KEY = "myleet-theme";
export const NIGHT_KEY = "myleet-night";
export const ACCENT_KEY = "myleet-accent";
const PREFS_KEY = "myleet-prefs";

export const DEFAULT_PREFS: Prefs = {
  reduceMotion: false,
  editor: { keymap: "standard", fontSize: 14, ligatures: true, minimap: false, indent: 4, formatOnSave: true, runOnSave: false },
  newPerDay: 3,
  timeTargets: { easy: 15, medium: 25, hard: 40 },
  reminders: { on: false, time: "19:00", lead: 15, quietFrom: "23:00", quietTo: "08:00" },
  publicProfile: false,
  plan: {
    goal: null,
    companies: [],
    interviewDate: null,
    dailyMinutes: null,
    weekendMinutes: null,
    dayMinutes: [],
    moves: [],
    sessionMinutes: 45,
    availability: [],
    daysOff: [],
    reminderMinutes: 15,
    startedAt: null,
    onboarded: false,
  },
};

type Patch<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : Patch<T[K]>) : T[K] };

function merge<T extends object>(base: T, patch: Patch<T> | undefined): T {
  if (!patch) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    const b = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object"
        ? merge(b as object, v as Patch<object>)
        : v === undefined
          ? b
          : v;
  }
  return out as T;
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    return merge(DEFAULT_PREFS, raw ? (JSON.parse(raw) as Patch<Prefs>) : undefined);
  } catch {
    return DEFAULT_PREFS;
  }
}

type Listener = (p: Prefs, patch: Patch<Prefs>) => void;
const listeners = new Set<Listener>();

/** Subscribes to changes made in this tab; returns the unsubscribe. */
export function onPrefsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updatePrefs(patch: Patch<Prefs>, opts: { silent?: boolean } = {}): Prefs {
  const next = merge(readPrefs(), patch);
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the change still applies to this page.
  }
  if (!opts.silent) for (const fn of listeners) fn(next, patch);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("myleet:prefs", { detail: next }));
  return next;
}

/** Windows the planner and the account accept: at least one day, start before end. */
export const validWindows = (w: Availability[]): Availability[] => w.filter((x) => x.days.length > 0 && x.start < x.end);

/** What the wasm planner (`trainer.plan`, `trainer.skills`) reads, in the account's field names. */
export function planSettings(p: Prefs = readPrefs()): PlanSettings {
  return {
    interview_date: p.plan.interviewDate,
    target_companies: p.plan.companies,
    new_per_day: p.newPerDay,
    daily_minutes: p.plan.dailyMinutes ?? 60,
    weekend_minutes: p.plan.weekendMinutes,
    session_minutes: p.plan.sessionMinutes,
    availability: validWindows(p.plan.availability),
    days_off: p.plan.daysOff,
    day_minutes: Object.fromEntries(p.plan.dayMinutes.map((d) => [d.date, d.minutes])),
    moves: p.plan.moves,
  };
}

// ---- theme: a Catppuccin flavor (or the system), the night flavor System uses after dark, an accent ----

function write(key: string, value: string | null): void {
  const s = storage();
  try {
    if (value === null) s?.removeItem(key);
    else s?.setItem(key, value);
  } catch {
    // Not persisted; still applied.
  }
}

export function readTheme(): ThemePref { return "mocha"; }

export function readNight(): NightFlavor { return "mocha"; }

export function readAccent(): Accent {
  const v = storage()?.getItem(ACCENT_KEY);
  return isAccent(v) ? v : DEFAULT_ACCENT;
}

export function resolvedFlavor(_pref: ThemePref = readTheme(), _night: NightFlavor = readNight()): Flavor {
  return "mocha";
}

/** Only the scheme, for callers that don't care which dark flavor. */
export function resolvedTheme(pref: ThemePref = readTheme()): "light" | "dark" {
  return resolvedFlavor(pref) === "latte" ? "light" : "dark";
}

function changed(): void {
  applyTheme(readTheme(), true);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("myleet:theme", { detail: readTheme() }));
}

/** Writes the choice and applies it with the 240 ms theme ease. */
export function setTheme(_pref: ThemePref): void {
  write(THEME_KEY, "mocha");
  changed();
}

export function setNight(_night: NightFlavor): void {
  write(NIGHT_KEY, "mocha");
  changed();
}

export function setAccent(accent: Accent): void {
  write(ACCENT_KEY, accent === DEFAULT_ACCENT ? null : accent);
  changed();
}

/** Theme, night flavor and accent at once (the account's copy), without the sync event. */
export function adoptAppearance(a: { theme?: unknown; night?: unknown; accent?: unknown }): void {
  write(THEME_KEY, "mocha");
  write(NIGHT_KEY, "mocha");
  if (isAccent(a.accent)) write(ACCENT_KEY, a.accent === DEFAULT_ACCENT ? null : a.accent);
  applyTheme(readTheme(), true);
}

export function applyTheme(pref: ThemePref = readTheme(), ease = false): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (ease) root.classList.add("theme-transition");
  const f = resolvedFlavor(pref);
  root.dataset.flavor = f;
  root.dataset.accent = readAccent();
  root.dataset.theme = f === "latte" ? "light" : "dark";
  const ground = flavorTokens(f).ground ?? "";
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = ground;
  if (ease) setTimeout(() => root.classList.remove("theme-transition"), 300);
}

/** The top-bar toggle and Shift+D flip between Latte and the night flavor from what is showing. */
export function toggleTheme(): Flavor {
  setTheme("mocha");
  return "mocha";
}

export function applyMotionPref(p: Prefs = readPrefs()): void {
  if (typeof document === "undefined") return;
  if (p.reduceMotion) document.documentElement.dataset.motion = "reduce";
  else delete document.documentElement.dataset.motion;
}
