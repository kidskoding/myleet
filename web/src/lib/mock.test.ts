import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "./memory-storage";
import {
  addReport,
  clockNote,
  clockPhase,
  newRound,
  outcomeLines,
  pickCompany,
  pickWeak,
  problemResult,
  readHistory,
  readRound,
  roundSecs,
  saveResult,
  writeRound,
  type WorkspaceReport,
} from "./mock";
import { ROOT } from "./test-util";
import type { Catalog, State } from "./types";

const cat = JSON.parse(readFileSync(join(ROOT, "public/data/catalog.json"), "utf8")) as Catalog;

const rep = (o: Partial<WorkspaceReport>): WorkspaceReport => ({
  problem: "two-sum",
  attempt: "a1",
  mode: "interview",
  event: "submit",
  passed: 6,
  total: 6,
  green: true,
  hints: 0,
  elapsedMs: 600_000,
  overTarget: false,
  ...o,
});

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

describe("round length and clock", () => {
  it("sizes rounds 25 / standard / 60 minutes", () => {
    expect([1, 2, 3].map((n) => roundSecs(n, 2700))).toEqual([1500, 2700, 3600]);
  });
  it("is calm, near in the last 10%, then over", () => {
    expect(clockPhase(0, 2700)).toBe("calm");
    expect(clockPhase((41 * 60 + 12) * 1000, 2700)).toBe("near");
    expect(clockPhase(2701_000, 2700)).toBe("over");
    expect(clockNote((41 * 60 + 12) * 1000, 2700)).toBe("of 45:00, 4 min left");
    expect(clockNote((47 * 60 + 10) * 1000, 2700)).toBe("+2:10 over");
  });
});

describe("reports", () => {
  it("keeps a green submit over a later run, takes a later submit", () => {
    let r = newRound({ problems: ["two-sum", "x"], secs: 2700, source: "mixed", company: null, now: 0 });
    r = addReport(r, rep({}), 10);
    r = addReport(r, rep({ event: "run", green: false, passed: 3 }), 20);
    expect(r.reports["two-sum"]?.passed).toBe(6);
    r = addReport(r, rep({ green: false, passed: 4 }), 30);
    expect(r.reports["two-sum"]?.passed).toBe(4);
    expect(addReport(r, rep({ problem: "other" }), 40)).toBe(r);
  });
});

describe("outcomes", () => {
  const base = { started: true, green: true, elapsedMs: 600_000, checks: [true, true, true] as [boolean, boolean, boolean], overTime: false };
  it("records a clean pass as one passed line", () => {
    expect(outcomeLines(base, 0, 180)).toEqual([{ kind: "passed", data: { elapsed_ms: "600000" } }]);
  });
  it("marks a failed self-check or overtime as not clean, and adds hint penalties", () => {
    expect(outcomeLines({ ...base, checks: [true, false, true] }, 0, 180)[0]).toEqual({ kind: "hint_revealed", data: { reason: "self_check" } });
    expect(outcomeLines({ ...base, overTime: true }, 0, 180)[0]?.data).toEqual({ reason: "over_time" });
    expect(outcomeLines(base, 1, 180).at(-1)?.data).toEqual({ elapsed_ms: "780000" });
  });
  it("misses an opened red problem and skips an unopened one", () => {
    expect(outcomeLines({ ...base, green: false }, 0, 180)).toEqual([{ kind: "gave_up", data: { reason: "mock" } }]);
    expect(outcomeLines({ ...base, started: false }, 0, 180)).toEqual([]);
  });
  it("flags a green submit after the round ran out as over time", () => {
    let r = newRound({ problems: ["two-sum"], secs: 60, source: "mixed", company: null, now: 0 });
    r = addReport(r, rep({}), 61_000);
    expect(problemResult(r, "two-sum", null, undefined)).toMatchObject({ started: true, green: true, overTime: true, rungBefore: -1 });
    expect(problemResult(r, "nope", null, undefined).started).toBe(false);
  });
});

describe("picks", () => {
  const google = cat.playlists.find((p) => p.id.endsWith("google"));
  it("draws distinct, not-mastered company problems from different techniques", () => {
    if (!google) throw new Error("no google set");
    const first = cat.problems[google.entries[0]?.problem ?? 0]?.id ?? "";
    const states = { [first]: { status: "mastered" } as State };
    const ids = pickCompany(cat, google.id, states, 3, 42);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain(first);
    const techs = ids.map((id) => cat.problems.find((p) => p.id === id)).map((p) => `${p?.module}:${p?.technique}`);
    expect(new Set(techs).size).toBe(3);
    expect(pickCompany(cat, google.id, states, 3, 42)).toEqual(ids);
  });
  it("draws weak-spot problems and comes up short when too few qualify", () => {
    const m = cat.modules[0];
    const t = m?.techniques[0];
    if (!m || !t) throw new Error("no module");
    const ids = pickWeak(cat, [{ module: m.id, technique: t.id }], {}, 2, 1);
    expect(ids).toHaveLength(2);
    expect(pickWeak(cat, [], {}, 2, 1)).toEqual([]);
  });
});

describe("storage", () => {
  it("keeps the active round and history, newest first", () => {
    const r = newRound({ problems: ["a"], secs: 60, source: "mixed", company: null, now: 5 });
    writeRound(r);
    expect(readRound()?.id).toBe(r.id);
    writeRound(null);
    expect(readRound()).toBeNull();
    const res = { id: "1", start: 0, end: 1, secs: 60, source: "mixed" as const, company: null, timeUp: false, problems: [] };
    saveResult(res);
    saveResult({ ...res, id: "2" });
    expect(readHistory().map((m) => m.id)).toEqual(["2", "1"]);
  });
});
