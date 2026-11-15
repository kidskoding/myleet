import { describe, expect, it } from "vitest";
import { parseEvents } from "./attempts";
import { entryState, lastCleanSet, leans, leanText, perDay, readiness } from "./companies";
import type { Catalog, Playlist, State } from "./types";

const st = (p: Partial<State>): State => ({
  status: "learning", rung: 0, due_ms: null, last_ms: 1, first_ms: 1, attempts: 1, clean_passes: 1, fails: 0, hint_attempts: 0, best_secs: 60, ...p,
});

const prob = (id: string, module: number, technique: number) =>
  ({ id, title: id, difficulty: "medium", url: `https://leetcode.com/problems/${id}/`, leetcode: 1, hints: [], key_idea: "", say_aloud: [], time_target_secs: 600, number: 1, module, technique, has_solution: true, dir: "" }) as const;

const cat = {
  guide: [],
  modules: [
    { id: "graphs", title: "Graphs", description: "", number: 10, bank: false, dir: "", notes: [], techniques: [{ id: "bfs", title: "Grid BFS", number: 1, note: null, problems: [0, 1, 2] }, { id: "topo", title: "Topological Sort", number: 2, note: null, problems: [3] }] },
    { id: "bank", title: "Bank", description: "", number: 99, bank: true, dir: "", notes: [], techniques: [{ id: "x", title: "X", number: 1, note: null, problems: [4] }] },
  ],
  problems: [prob("a", 0, 0), prob("b", 0, 0), prob("c", 0, 0), prob("d", 0, 1), prob("e", 1, 0)],
  playlists: [],
} as unknown as Catalog;

const set: Playlist = {
  id: "001_google",
  title: "Google",
  group: "Big Tech",
  focus: "",
  entries: [
    { title: "a", url: "", problem: 0 },
    { title: "b", url: "", problem: 1 },
    { title: "c", url: "", problem: 2 },
    { title: "d", url: "", problem: 3 },
    { title: "e", url: "", problem: 4 },
    { title: "z", url: "https://leetcode.com/problems/z/", problem: null },
  ],
};

const line = (t: string, kind: string, problem: string, attempt: string, data?: Record<string, string>) =>
  JSON.stringify({ t, kind, problem, attempt, mode: "practice", ...(data ? { data } : {}) });

describe("companies", () => {
  it("counts a clean latest finish as ready, a hinted one as climbing", () => {
    const ev = parseEvents(
      [
        line("2026-11-01T10:00:00Z", "opened", "a", "1"),
        line("2026-11-01T10:05:00Z", "passed", "a", "1", { elapsed_ms: "300000" }),
        line("2026-11-02T10:00:00Z", "opened", "b", "2"),
        line("2026-11-02T10:01:00Z", "hint_revealed", "b", "2"),
        line("2026-11-02T10:05:00Z", "passed", "b", "2", { elapsed_ms: "300000" }),
      ].join("\n"),
    );
    const clean = lastCleanSet(ev, () => 600);
    expect([...clean]).toEqual(["a"]);
    expect(entryState(st({ rung: 0 }), true)).toBe("ready");
    expect(entryState(st({ rung: 0 }), false)).toBe("climbing");
    expect(entryState(st({ status: "mastered", rung: 4 }), false)).toBe("ready");
  });

  it("sums readiness and leaves untracked entries out", () => {
    const states = { a: st({ status: "mastered", rung: 4 }), b: st({ rung: 1, due_ms: 5 }), d: st({ rung: -1 }) };
    const r = readiness(set, cat, states, new Set(), 10);
    expect(r).toEqual({ tracked: 5, untracked: 1, ready: 1, mastered: 1, climbing: 1, started: 1, unseen: 2, due: 1 });
  });

  it("ranks the techniques the set leans on and labels them", () => {
    const states = { a: st({ status: "mastered", rung: 4 }), b: st({ status: "mastered", rung: 4 }) };
    const l = leans(set, cat, states, new Set());
    expect(l.map((x) => [x.title, x.count, leanText(x.status)])).toEqual([
      ["Grid BFS", 3, "Ready"],
      ["Topological Sort", 1, "Not started on 1"],
      ["X", 1, "Not started on 1"],
    ]);
  });

  it("includes bank problems and keeps technique totals consistent with readiness", () => {
    const states = { e: st({ status: "mastered", rung: 4 }) };
    const rows = leans(set, cat, states, new Set());
    const total = readiness(set, cat, states, new Set(), 10);
    expect(rows.reduce((n, row) => n + row.count, 0)).toBe(total.tracked);
    expect(rows.reduce((n, row) => n + row.ready, 0)).toBe(total.ready);
    expect(rows.find((row) => row.module === "bank")?.ready).toBe(1);
  });

  it("paces the rest of the set to the date", () => {
    expect(perDay(36, 23)).toBe(2);
    expect(perDay(36, null)).toBeNull();
    expect(perDay(0, 5)).toBe(1);
  });
});
