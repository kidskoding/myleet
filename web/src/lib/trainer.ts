import init, * as wasm from "../wasm/myleet_wasm.js";
import { loadCatalog } from "./catalog";
import type {
  Checkpoint,
  CheckpointResult,
  EventKind,
  InterviewRules,
  LeetcodeImport,
  LeetcodeProfile,
  Mode,
  Placement,
  PlacementResult,
  AttemptFeedback,
  Habits,
  Plan,
  PlanFixes,
  PlanSettings,
  Skills,
  State,
  Stats,
  TodayEntry,
} from "./types";

export const DEFAULT_NEW_PER_DAY = 3;

/** Clock and zone for one call; defaults are `Date.now()` and the browser's zone. */
export interface When {
  now?: number;
  tz?: string;
}

export interface TrainerApi {
  today(events: string, opts?: When & { newPerDay?: number }): TodayEntry[];
  states(events: string, tz?: string): Record<string, State>;
  /** `progress.toml` text, the same file the CLI writes. */
  saveFile(events: string, tz?: string): string;
  stats(events: string, opts?: When): Stats;
  placement(events: string): Placement;
  /** Returns one `events.jsonl` line. */
  placementDone(results: PlacementResult[], now?: number): string;
  checkpoint(events: string): Checkpoint;
  checkpointPick(events: string, through: number, seed: number, tz?: string): string[];
  /** Returns one `events.jsonl` line. */
  checkpointDone(through: number, results: CheckpointResult[], now?: number): string;
  interviewPick(events: string, n: number, seed: number, opts?: When): string[];
  /** Returns one `events.jsonl` line; `data` values are strings, as the core stores them. */
  eventLine(e: { kind: EventKind; problem: string; attempt: string; mode: Mode; data?: Record<string, string>; now?: number }): string;
  newAttemptId(): string;
  placementSkip(now?: number): string;
  checkpointSnooze(through: number, now?: number): string;
  formatSecs(secs: number): string;
  interviewRules(): InterviewRules;
  /** Day-by-day plan to the interview (28 days without one). */
  plan(events: string, settings?: PlanSettings, opts?: When): Plan;
  skills(events: string, settings?: PlanSettings, opts?: When): Skills;
  /** The weekday budget that closes each forecast gap, and the over-budget note. */
  planFixes(events: string, settings?: PlanSettings, opts?: When): PlanFixes;
  /** Practice history (painter dots, suggestion) and "Noticed this week". */
  habits(events: string, opts?: When & { limit?: number }): Habits;
  /** What one attempt changed for its technique; null when it isn't a finished attempt. */
  attemptFeedback(events: string, attempt: string, opts?: When): AttemptFeedback | null;
  /** Lines to append after fetching a LeetCode profile, plus the one-time summary. `reconnect` clears old markers first. */
  leetcodeImport(events: string, profile: LeetcodeProfile, opts?: When & { reconnect?: boolean }): { lines: string[]; summary: string; marked: number };
  /** The current import, or null when LeetCode is not connected. */
  leetcode(events: string): LeetcodeImport | null;
  /** The event line that clears the import. */
  leetcodeDisconnect(now?: number): string;
  /** iCalendar text for a plan. */
  planIcs(plan: Plan, options?: { site?: string; alarm_minutes?: number | null; uid_suffix?: string; name?: string }): string;
}

type WasmInput = Parameters<typeof wasm.initSync>[0];

/** Synchronous build from already-loaded parts; `module` is the wasm bytes when not fetched by `init()`. */
export function createTrainer(catalogText: string, module?: WasmInput): TrainerApi {
  if (module) wasm.initSync(module);
  const t = new wasm.Trainer(catalogText);
  const parse = <T>(s: string): T => JSON.parse(s) as T;
  const now = (n?: number) => n ?? Date.now();
  return {
    today: (ev, o = {}) => parse(t.today(ev, now(o.now), o.tz ?? "", o.newPerDay ?? DEFAULT_NEW_PER_DAY)),
    states: (ev, tz = "") => parse(t.states(ev, tz)),
    saveFile: (ev, tz = "") => t.save_file(ev, tz),
    stats: (ev, o = {}) => parse(t.stats(ev, now(o.now), o.tz ?? "")),
    placement: (ev) => parse(t.placement(ev)),
    placementDone: (results, n) => t.placement_done(JSON.stringify(results), now(n)),
    checkpoint: (ev) => parse(t.checkpoint(ev)),
    checkpointPick: (ev, through, seed, tz = "") => parse(t.checkpoint_pick(ev, tz, through, seed)),
    checkpointDone: (through, results, n) => t.checkpoint_done(through, JSON.stringify(results), now(n)),
    interviewPick: (ev, n, seed, o = {}) => parse(t.interview_pick(ev, o.tz ?? "", n, now(o.now), seed)),
    eventLine: (e) =>
      wasm.event_line(e.kind, e.problem, e.attempt, e.mode, e.data ? JSON.stringify(e.data) : "", now(e.now)),
    newAttemptId: () => wasm.new_attempt_id(),
    placementSkip: (n) => wasm.placement_skip(now(n)),
    checkpointSnooze: (through, n) => wasm.checkpoint_snooze(through, now(n)),
    formatSecs: (secs) => wasm.format_secs(secs),
    interviewRules: () => parse(wasm.interview_rules()),
    plan: (ev, settings, o = {}) => parse(t.plan(ev, settings ? JSON.stringify(settings) : "", now(o.now), o.tz ?? "")),
    skills: (ev, settings, o = {}) => parse(t.skills(ev, now(o.now), o.tz ?? "", settings ? JSON.stringify(settings) : "")),
    planFixes: (ev, settings, o = {}) => parse(t.plan_fixes(ev, settings ? JSON.stringify(settings) : "", now(o.now), o.tz ?? "")),
    habits: (ev, o = {}) => parse(t.habits(ev, now(o.now), o.tz ?? "", o.limit ?? 3)),
    attemptFeedback: (ev, attempt, o = {}) => parse(t.attempt_feedback(ev, attempt, now(o.now), o.tz ?? "")),
    leetcodeImport: (ev, profile, o = {}) => parse(t.leetcode_import(ev, JSON.stringify(profile), now(o.now), o.tz ?? "", o.reconnect ?? false)),
    leetcode: (ev) => parse(t.leetcode(ev)),
    leetcodeDisconnect: (n) => wasm.leetcode_disconnect(now(n)),
    planIcs: (plan, options) => wasm.plan_ics(JSON.stringify(plan), options ? JSON.stringify(options) : ""),
  };
}

let trainerPromise: Promise<TrainerApi> | undefined;

/** Fetches the wasm module and the catalog once per page. */
export function loadTrainer(): Promise<TrainerApi> {
  trainerPromise ??= Promise.all([init(), loadCatalog()]).then(([, c]) => createTrainer(c.text));
  trainerPromise.catch(() => (trainerPromise = undefined));
  return trainerPromise;
}
