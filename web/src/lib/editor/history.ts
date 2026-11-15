// Past attempts at one problem, read from events.jsonl for the History tab.

export type AttemptOutcome = "passed" | "gave_up" | "missed" | "left" | "open";

export interface AttemptSummary {
  id: string;
  mode: string;
  start: number;
  end: number | null;
  outcome: AttemptOutcome;
  elapsedMs: number | null;
  hints: number;
  peeks: number;
  restarts: number;
  lastRun: { passed: number; total: number } | null;
  /** Lines of the events text up to and including this attempt's end, for the ladder after it. */
  throughLine: number;
}

interface Line {
  t: string;
  kind: string;
  problem: string;
  attempt: string;
  mode: string;
  data?: Record<string, string>;
}

/** Newest first. */
export function attemptsFor(events: string, problem: string): AttemptSummary[] {
  const byId = new Map<string, AttemptSummary>();
  const lines = events.split("\n");
  lines.forEach((raw, i) => {
    if (!raw.trim()) return;
    let e: Line;
    try {
      e = JSON.parse(raw) as Line;
    } catch {
      return;
    }
    if (e.problem !== problem || !e.attempt) return;
    const t = Date.parse(e.t);
    let a = byId.get(e.attempt);
    if (!a) {
      a = {
        id: e.attempt,
        mode: e.mode,
        start: t,
        end: null,
        outcome: "open",
        elapsedMs: null,
        hints: 0,
        peeks: 0,
        restarts: 0,
        lastRun: null,
        throughLine: i + 1,
      };
      byId.set(e.attempt, a);
    }
    const done = a.outcome !== "open";
    switch (e.kind) {
      case "hint_revealed":
        if (!done) a.hints++;
        break;
      case "solution_peeked":
        if (!done) a.peeks++;
        break;
      case "timer_restarted":
        if (!done) a.restarts++;
        break;
      case "test_run":
        a.lastRun = { passed: Number(e.data?.["passed"] ?? 0), total: Number(e.data?.["total"] ?? 0) };
        break;
      case "passed":
        if (done) break;
        a.outcome = "passed";
        a.end = t;
        a.elapsedMs = e.data?.["elapsed_ms"] ? Number(e.data["elapsed_ms"]) : t - a.start;
        a.throughLine = i + 1;
        break;
      case "gave_up":
        if (done) break;
        a.outcome = e.data?.["reason"] === "failed_submit" ? "missed" : "gave_up";
        a.end = t;
        a.elapsedMs = t - a.start;
        a.throughLine = i + 1;
        break;
      case "left":
        if (done) break;
        a.outcome = "left";
        a.end = t;
        a.elapsedMs = t - a.start;
        a.throughLine = i + 1;
        break;
    }
    if (a.outcome === "open") a.throughLine = i + 1;
  });
  return [...byId.values()].sort((x, y) => y.start - x.start);
}

/** The tag on a History row. */
export function outcomeTag(a: AttemptSummary, targetMs: number): { text: string; tone: "pass" | "fail" | "due" | "progress" } {
  switch (a.outcome) {
    case "passed":
      if (a.peeks > 0) return { text: "Passed after a peek", tone: "due" };
      if (a.hints > 0) return { text: "Hint used", tone: "due" };
      if (a.restarts > 0) return { text: "Restarted", tone: "due" };
      if ((a.elapsedMs ?? 0) >= targetMs) return { text: "Over target", tone: "due" };
      return { text: "Clean pass", tone: "pass" };
    case "gave_up":
      return { text: "Gave up", tone: "fail" };
    case "missed":
      return { text: a.lastRun ? `Missed, ${a.lastRun.passed} of ${a.lastRun.total}` : "Missed", tone: "fail" };
    case "left":
      return { text: "Left", tone: "progress" };
    case "open":
      return a.lastRun
        ? { text: `${a.lastRun.passed} of ${a.lastRun.total}`, tone: a.lastRun.passed === a.lastRun.total ? "pass" : "fail" }
        : { text: "In progress", tone: "progress" };
  }
}

/** Events text through an attempt, to ask the scheduler for the ladder right after it. */
export function eventsThrough(events: string, a: AttemptSummary): string {
  return events.split("\n").slice(0, a.throughLine).join("\n") + "\n";
}
