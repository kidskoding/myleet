// Mock interview rounds: picking problems, the round clock, and what each problem's
// result records. The workspace (`/p/<id>?mode=interview`) never records `passed` or
// `gave_up` in a round; the round owns the outcome (components/workspace/README.md).
import type { Catalog, EventKind, Mode, State } from "./types";

/** Mirrors `WorkspaceReport` in components/workspace/mount.ts. */
export interface WorkspaceReport {
  problem: string;
  attempt: string | null;
  mode: Mode;
  event: "run" | "submit" | "hint";
  passed: number;
  total: number;
  green: boolean;
  hints: number;
  elapsedMs: number;
  overTarget: boolean;
}

export type Source = "mixed" | "company" | "weak";
/** Said the approach, stated time and space, tested an edge case. */
export type Checks = [boolean | null, boolean | null, boolean | null];

export interface Round {
  id: string;
  start: number;
  secs: number;
  source: Source;
  /** Company slug when `source` is "company". */
  company: string | null;
  companies?: string[];
  problems: string[];
  current: number;
  /** Last report per problem, stamped with when it arrived. */
  reports: Record<string, WorkspaceReport & { at: number }>;
  /** Chose "Keep coding" at time up: the clock runs over. */
  overtime: boolean;
  phase: "round" | "check";
  end: number | null;
  checks: Record<string, Checks>;
}

export interface ProblemResult {
  id: string;
  attempt: string | null;
  started: boolean;
  passed: number;
  total: number;
  green: boolean;
  elapsedMs: number;
  checks: Checks | null;
  overTime: boolean;
  /** Core rung (-1..4) before and after the round's lines. */
  rungBefore: number;
  rungAfter: number;
}

export interface MockResult {
  id: string;
  start: number;
  end: number;
  secs: number;
  source: Source;
  company: string | null;
  companies?: string[];
  timeUp: boolean;
  problems: ProblemResult[];
}

export const ROUND_KEY = "myleet:mock-round";
export const HISTORY_KEY = "myleet:mocks";

/** 1 problem about 25 min, 2 the standard round, 3 a tight onsite. */
export function roundSecs(n: number, standardSecs: number): number {
  return n <= 1 ? 25 * 60 : n === 2 ? standardSecs : 60 * 60;
}

export function newRound(o: { problems: string[]; secs: number; source: Source; company: string | null; companies?: string[]; now: number }): Round {
  return {
    id: o.now.toString(36),
    start: o.now,
    secs: o.secs,
    source: o.source,
    company: o.company,
    ...(o.companies ? { companies: o.companies } : {}),
    problems: o.problems,
    current: 0,
    reports: {},
    overtime: false,
    phase: "round",
    end: null,
    checks: {},
  };
}

/** Keeps the latest report per problem; a later Run never hides an earlier green Submit. */
export function addReport(r: Round, rep: WorkspaceReport, now: number): Round {
  if (!r.problems.includes(rep.problem)) return r;
  const old = r.reports[rep.problem];
  const keepOld = old?.event === "submit" && old.green && rep.event !== "submit";
  return keepOld ? r : { ...r, reports: { ...r.reports, [rep.problem]: { ...rep, at: now } } };
}

export type ClockPhase = "calm" | "near" | "over";

/** Near is the last 10% of the round (amber), over is past it (red). */
export function clockPhase(elapsedMs: number, secs: number): ClockPhase {
  const left = secs * 1000 - elapsedMs;
  if (left < 0) return "over";
  return left <= secs * 100 ? "near" : "calm";
}

export function clock(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/** The line under the clock: "of 45:00, 3 min left" or "+2:10 over". */
export function clockNote(elapsedMs: number, secs: number): string {
  const left = secs * 1000 - elapsedMs;
  if (left < 0) return `+${clock(-left)} over`;
  const mins = Math.ceil(left / 60000);
  return clockPhase(elapsedMs, secs) === "near" ? `of ${clock(secs * 1000)}, ${mins} min left` : `of ${clock(secs * 1000)}`;
}

/** Minutes-left marks the live region announces once each. */
export const ANNOUNCE_AT = [5, 1];

export const allYes = (c: Checks | null | undefined): boolean => !!c && c.every((x) => x === true);

export interface Line {
  kind: EventKind;
  data?: Record<string, string>;
}

/**
 * What one problem's result appends, on its attempt id, in mode interview.
 * Green: `passed` with the elapsed time plus hint penalties. A failed self-check or a
 * pass after the round ran out first adds a `hint_revealed` with a `reason`, which is
 * how the core (schedule.rs `attempts`: clean = no hints) learns it was not clean.
 * Opened but not green: `gave_up`, a miss. Never opened: nothing.
 */
export function outcomeLines(p: Pick<ProblemResult, "started" | "green" | "elapsedMs" | "checks" | "overTime">, hints: number, penaltySecs: number): Line[] {
  if (!p.started) return [];
  if (!p.green) return [{ kind: "gave_up", data: { reason: "mock" } }];
  const lines: Line[] = [];
  if (!allYes(p.checks)) lines.push({ kind: "hint_revealed", data: { reason: "self_check" } });
  else if (p.overTime) lines.push({ kind: "hint_revealed", data: { reason: "over_time" } });
  lines.push({ kind: "passed", data: { elapsed_ms: String(Math.round(p.elapsedMs + hints * penaltySecs * 1000)) } });
  return lines;
}

/** One problem's result from the round state and the opened attempt (from events.jsonl). */
export function problemResult(r: Round, id: string, attempt: string | null, before: State | undefined): ProblemResult {
  const rep = r.reports[id];
  const green = rep?.event === "submit" && rep.green;
  return {
    id,
    attempt: rep?.attempt ?? attempt,
    started: !!(rep?.attempt ?? attempt),
    passed: rep?.passed ?? 0,
    total: rep?.total ?? 0,
    green,
    elapsedMs: rep?.elapsedMs ?? 0,
    checks: r.checks[id] ?? null,
    overTime: !!green && !!rep && rep.at > r.start + r.secs * 1000,
    rungBefore: before?.rung ?? -1,
    rungAfter: before?.rung ?? -1,
  };
}

// ---- picking problems ----

/** Seeded order so one seed reproduces a round. */
function shuffle<T>(xs: T[], seed: number): T[] {
  let s = seed >>> 0 || 1;
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** One problem per technique first, then any; never two of the same problem. */
function spread(ids: string[], techOf: (id: string) => string, n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) if (out.length < n && !seen.has(techOf(id))) (out.push(id), seen.add(techOf(id)));
  for (const id of ids) if (out.length < n && !out.includes(id)) out.push(id);
  return out;
}

const techKey = (c: Catalog) => (id: string) => {
  const p = c.problems.find((x) => x.id === id);
  return p ? `${p.module}:${p.technique}` : id;
};

/** Not-mastered tracked entries of a company set, from the most asked, spread across techniques. */
export function pickCompany(c: Catalog, playlistId: string, states: Record<string, State>, n: number, seed: number): string[] {
  const pl = c.playlists.find((p) => p.id === playlistId);
  if (!pl) return [];
  const ids = pl.entries.flatMap((e) => (e.problem === null ? [] : [c.problems[e.problem]?.id ?? ""])).filter(Boolean);
  const open = ids.filter((id) => states[id]?.status !== "mastered");
  // Rotate among the most asked half so repeat mocks don't always draw the same problems.
  const head = shuffle(open.slice(0, Math.max(n * 4, Math.ceil(open.length / 2))), seed);
  return spread(head, techKey(c), n);
}

export const MAX_MOCK_COMPANIES = 3;

export function companySelection(value: string): string[] {
  if (!value) return [];
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return [value]; }
}

/** Interleave each company's candidates before shuffling; shared questions appear once. */
export function pickCompanies(c: Catalog, playlistIds: string[], states: Record<string, State>, n: number, seed: number): string[] {
  const selected = [...new Set(playlistIds)];
  if (selected.length > MAX_MOCK_COMPANIES) throw new Error("Choose up to 3 companies");
  const pools = selected.map((id, i) => pickCompany(c, id, states, Math.max(n * 4, 12), seed + i));
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (let rank = 0; rank < Math.max(0, ...pools.map((p) => p.length)); rank++) {
    for (const pool of pools) {
      const id = pool[rank];
      if (id && !seen.has(id)) { seen.add(id); candidates.push(id); }
    }
  }
  return spread(shuffle(candidates, seed), techKey(c), n);
}

/** Not-mastered problems in the weak techniques (`stats.weakest`), one per technique first. */
export function pickWeak(c: Catalog, weak: { module: string; technique: string }[], states: Record<string, State>, n: number, seed: number): string[] {
  const ids: string[] = [];
  for (const w of weak) {
    const m = c.modules.find((x) => x.id === w.module);
    const t = m?.techniques.find((x) => x.id === w.technique || x.title === w.technique);
    for (const i of t?.problems ?? []) {
      const id = c.problems[i]?.id;
      if (id && states[id]?.status !== "mastered") ids.push(id);
    }
  }
  return spread(shuffle(ids, seed), techKey(c), n);
}

// ---- storage ----

function store(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(store()?.getItem(key) ?? "null") as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown): void {
  try {
    if (v === null) store()?.removeItem(key);
    else store()?.setItem(key, JSON.stringify(v));
  } catch {
    // A full or blocked store: the round still runs in this page.
  }
}

export const readRound = (): Round | null => read<Round | null>(ROUND_KEY, null);
export const writeRound = (r: Round | null): void => write(ROUND_KEY, r);
export const readHistory = (): MockResult[] => read<MockResult[]>(HISTORY_KEY, []);
export const saveResult = (m: MockResult): void => write(HISTORY_KEY, [m, ...readHistory().filter((x) => x.id !== m.id)]);
