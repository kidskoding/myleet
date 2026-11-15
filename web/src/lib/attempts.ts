// Reads attempts out of events.jsonl for screens that summarise them (Done today, the
// placement warm-up, the check-in). The wasm core owns scheduling; this only reports.
import type { EventKind, Mode, PlacementResult, CheckpointResult } from "./types";

export interface Ev {
  t: number;
  kind: EventKind | string;
  problem: string;
  attempt: string;
  mode: Mode | string;
  data: Record<string, string>;
}

export function parseEvents(text: string): Ev[] {
  const out: Ev[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as Partial<Ev> & { t?: string };
      const t = Date.parse(e.t ?? "");
      if (Number.isNaN(t)) continue;
      out.push({ t, kind: e.kind ?? "", problem: e.problem ?? "", attempt: e.attempt ?? "", mode: e.mode ?? "", data: e.data ?? {} });
    } catch {
      // The core skips unreadable lines too.
    }
  }
  return out;
}

export interface Attempt {
  id: string;
  problem: string;
  mode: string;
  start: number;
  end: number | null;
  passed: boolean;
  gaveUp: boolean;
  hints: number;
  peeks: number;
  elapsedMs: number | null;
}

export function attempts(events: Ev[]): Attempt[] {
  const by = new Map<string, Attempt>();
  for (const e of events) {
    if (!e.attempt || !e.problem) continue;
    let a = by.get(e.attempt);
    if (!a) {
      a = { id: e.attempt, problem: e.problem, mode: e.mode, start: e.t, end: null, passed: false, gaveUp: false, hints: 0, peeks: 0, elapsedMs: null };
      by.set(e.attempt, a);
    }
    if (e.kind === "hint_revealed") a.hints += 1;
    else if (e.kind === "solution_peeked") a.peeks += 1;
    else if (e.kind === "passed") {
      a.passed = true;
      a.end = e.t;
      const ms = Number(e.data.elapsed_ms);
      a.elapsedMs = Number.isFinite(ms) ? ms : e.t - a.start;
    } else if (e.kind === "gave_up") {
      a.gaveUp = true;
      a.end = e.t;
    }
  }
  return [...by.values()];
}

export type Finish = "clean" | "assisted" | "gave_up";

/** Clean = passed with no hints or peeks, within the time target. */
export function finishOf(a: Attempt, targetSecs: number): Finish | null {
  if (a.gaveUp && !a.passed) return "gave_up";
  if (!a.passed) return null;
  const over = a.elapsedMs !== null && targetSecs > 0 && a.elapsedMs > targetSecs * 1000;
  return a.hints || a.peeks || over ? "assisted" : "clean";
}

export interface DoneItem {
  problem: string;
  finish: Finish;
  elapsedMs: number | null;
  at: number;
}

const PRACTICE_MODES = new Set(["practice", "drill", "interview"]);

/** Problems finished on the local day of `now`, latest finish per problem, newest first. */
export function doneToday(events: Ev[], targetSecs: (id: string) => number, now: Date = new Date()): DoneItem[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = start.getTime() + 86_400_000;
  const latest = new Map<string, DoneItem>();
  for (const a of attempts(events)) {
    if (!PRACTICE_MODES.has(a.mode) || a.end === null || a.end < start.getTime() || a.end >= end) continue;
    const finish = finishOf(a, targetSecs(a.problem));
    if (!finish) continue;
    const prev = latest.get(a.problem);
    if (!prev || prev.at < a.end) latest.set(a.problem, { problem: a.problem, finish, elapsedMs: a.elapsedMs, at: a.end });
  }
  return [...latest.values()].sort((x, y) => y.at - x.at);
}

export interface ItemProgress {
  problem: string;
  /** Latest finished attempt in the mode, if any. */
  finished: Attempt | null;
  started: boolean;
}

/** Per-problem state of a placement or check-in run, from attempts in that mode after `since`. */
export function runProgress(events: Ev[], problems: string[], mode: "placement" | "checkpoint", since = 0): ItemProgress[] {
  const list = attempts(events).filter((a) => a.mode === mode && a.start >= since);
  return problems.map((problem) => {
    const mine = list.filter((a) => a.problem === problem);
    const finished = mine.filter((a) => a.end !== null).sort((a, b) => (b.end ?? 0) - (a.end ?? 0))[0] ?? null;
    return { problem, finished, started: mine.length > 0 };
  });
}

/** Results for `placement_done`; unfinished items count as skipped. */
export function placementResults(
  items: { topic: string; problem: string }[],
  progress: ItemProgress[],
  targetSecs: (id: string) => number,
): PlacementResult[] {
  return items.map((it, i) => {
    const a = progress[i]?.finished;
    if (!a) return { topic: it.topic, problem: it.problem, passed: false, skipped: true };
    const over = a.elapsedMs !== null && a.elapsedMs > targetSecs(it.problem) * 1000;
    return { topic: it.topic, problem: it.problem, passed: a.passed, hints: a.hints + a.peeks, over_time: over };
  });
}

export function checkpointResults(progress: ItemProgress[]): CheckpointResult[] {
  return progress.map((p) =>
    p.finished ? { problem: p.problem, passed: p.finished.passed, hints: p.finished.hints + p.finished.peeks } : { problem: p.problem, passed: false, skipped: true },
  );
}
