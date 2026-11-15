import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ItemProgress } from "./attempts";
import { CODING_MAX, excerpt, findings, findingText, summaryLine, gradeAnswer, gradeCoding, nextCoding, OPTIONS, placementItems, QUESTIONS, questions, QUICK_MS, topicById, type DiagnosticState, type Grade } from "./diagnostic";
import { ROOT } from "./test-util";
import { createTrainer } from "./trainer";
import type { Catalog } from "./types";

const catalogText = readFileSync(join(ROOT, "public/data/catalog.json"), "utf8");
const c = JSON.parse(catalogText) as Catalog;
const byId = new Map(c.problems.map((p) => [p.id, p]));

const state = (seed: number, over: Partial<DiagnosticState> = {}): DiagnosticState => ({ seed, started: 0, answers: [], coding: [], ...over });

/** Answers every question: right for `right` topics, "I don't know" for the rest. */
function answerAll(seed: number, right: string[]) {
  const qs = questions(c, seed);
  const answers = qs.map((q) => ({ topic: q.topic, problem: q.problem, choice: right.includes(q.topic) ? q.answer : null, ms: 20_000 }));
  return { qs, s: state(seed, { answers }) };
}

const finished = (passed: boolean, extra: Partial<NonNullable<ItemProgress["finished"]>> = {}): ItemProgress => ({
  problem: "x",
  started: true,
  finished: { id: "a", problem: "x", mode: "placement", start: 0, end: 1, passed, gaveUp: false, hints: 0, peeks: 0, elapsedMs: 60_000, ...extra },
});

describe("questions", () => {
  it("are the same for the same seed and differ across seeds", () => {
    expect(questions(c, 7)).toEqual(questions(c, 7));
    const seen = new Set(Array.from({ length: 20 }, (_, i) => questions(c, i).map((q) => q.problem).join()));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("ask eight distinct topics from real problems, the answer among four options", () => {
    for (let seed = 0; seed < 200; seed++) {
      const qs = questions(c, seed);
      expect(qs).toHaveLength(QUESTIONS);
      expect(new Set(qs.map((q) => q.topic)).size).toBe(QUESTIONS);
      for (const q of qs) {
        const p = byId.get(q.problem);
        const t = topicById(q.topic);
        expect(p && t).toBeTruthy();
        expect(c.modules[p?.module ?? -1]?.id).toBe(t?.module);
        expect(["easy", "medium"]).toContain(p?.difficulty);
        expect(q.options).toHaveLength(OPTIONS);
        expect(new Set(q.options).size).toBe(OPTIONS);
        expect(q.options).toContain(q.answer);
        if (t?.giveaway) expect(p?.title).not.toMatch(t.giveaway);
      }
    }
  });

  it("always cover the six core patterns", () => {
    const topics = questions(c, 3).map((q) => q.topic);
    for (const t of ["hashing", "two-pointers", "sliding-window", "binary-search", "trees", "graphs"]) expect(topics).toContain(t);
  });
});

describe("grading", () => {
  it("grades answers by correctness and speed", () => {
    const q = { answer: "Heap" };
    expect(gradeAnswer(q, { choice: "Heap", ms: 1000 })).toBe("clean");
    expect(gradeAnswer(q, { choice: "Heap", ms: QUICK_MS + 1 })).toBe("hinted");
    expect(gradeAnswer(q, { choice: "Stack", ms: 1000 })).toBe("failed");
    expect(gradeAnswer(q, { choice: null, ms: 1000 })).toBe("skipped");
  });

  it("grades coding attempts, a give-up as a skip", () => {
    expect(gradeCoding({ problem: "x", started: false, finished: null }, 600)).toBeNull();
    expect(gradeCoding(finished(true), 600)).toBe("clean");
    expect(gradeCoding(finished(true, { hints: 1 }), 600)).toBe("hinted");
    expect(gradeCoding(finished(true, { elapsedMs: 700_000 }), 600)).toBe("hinted");
    expect(gradeCoding(finished(false), 600)).toBe("failed");
    expect(gradeCoding(finished(false, { gaveUp: true }), 600)).toBe("skipped");
  });
});

describe("coding steps", () => {
  it("starts easy on the first missed topic", () => {
    const { qs, s } = answerAll(11, ["hashing", "two-pointers"]);
    const first = nextCoding(c, s, qs, []);
    expect(first?.topic).toBe("sliding-window");
    expect(first?.difficulty).toBe("easy");
    expect(byId.get(first?.problem ?? "")?.difficulty).toBe("easy");
  });

  it("starts medium when every answer was right, and steps up after a clean pass", () => {
    const { qs, s } = answerAll(5, questions(c, 5).map((q) => q.topic));
    const first = nextCoding(c, s, qs, []);
    expect(first?.difficulty).toBe("medium");
    const s2 = { ...s, coding: [first as NonNullable<typeof first>] };
    const second = nextCoding(c, s2, qs, ["clean"]);
    expect(second?.difficulty).toBe("hard");
    expect(second?.topic).not.toBe(first?.topic);
    expect(nextCoding(c, s2, qs, ["failed"])?.difficulty).toBe("medium");
  });

  it("waits for the current problem, and stops after two without a clean pass or at the cap", () => {
    const { qs, s } = answerAll(2, []);
    const a = nextCoding(c, s, qs, []);
    const b = nextCoding(c, { ...s, coding: [a!] }, qs, ["failed"]);
    expect(nextCoding(c, { ...s, coding: [a!] }, qs, [null])).toBeNull();
    expect(nextCoding(c, { ...s, coding: [a!, b!] }, qs, ["failed", "skipped"])).toBeNull();
    const third = nextCoding(c, { ...s, coding: [a!, b!] }, qs, ["clean", "failed"]);
    expect(third).not.toBeNull();
    expect(nextCoding(c, { ...s, coding: [a!, b!, third!] }, qs, ["clean", "clean", "clean"])).toBeNull();
    expect(CODING_MAX).toBe(3);
    const used = [a, b, third].map((x) => x?.problem);
    expect(new Set(used).size).toBe(3);
    for (const q of qs) expect(used).not.toContain(q.problem);
  });
});

describe("results", () => {
  it("keeps one item per topic, the coding grade over the answer, in topic order", () => {
    const { qs, s } = answerAll(9, ["hashing"]);
    const code = nextCoding(c, s, qs, [])!;
    const items = placementItems({ ...s, coding: [code] }, qs, ["clean"]);
    expect(items).toHaveLength(QUESTIONS);
    const coded = items.find((i) => i.problem === code.problem);
    expect(coded).toMatchObject({ passed: true, skipped: false, over_time: false });
    expect(items.find((i) => i.topic === "hash map or set")).toMatchObject({ passed: true, over_time: false });
    expect(items.filter((i) => i.skipped)).toHaveLength(QUESTIONS - 2);
    for (const i of items) expect(i.topic).not.toMatch(/[:,]/);
  });

  it("round-trips through the core placement line", () => {
    const t = createTrainer(catalogText, { module: readFileSync(join(ROOT, "src/wasm/myleet_wasm_bg.wasm")) });
    const { qs, s } = answerAll(4, ["hashing", "two-pointers"]);
    const grades: Grade[] = [];
    const line = t.placementDone(placementItems(s, qs, grades), Date.parse("2026-11-14T15:00:00Z"));
    const pl = t.placement(`${line}\n`);
    expect(pl.done).toBe(true);
    expect(pl.result?.items.filter((i) => i.level === "strong")).toHaveLength(2);
    expect(pl.recommend).toBe("sliding_window");
    // The diagnostic guides study only: no problem has a review rung.
    expect(Object.values(t.states(`${line}\n`)).every((st) => st.rung < 0)).toBe(true);
  });
});

describe("excerpt", () => {
  it("keeps the statement before the examples", () => {
    const md = "Given an array.\n\nReturn the answer.\n\n**Example 1:**\n\n```\nnums = [1]\n```";
    expect(excerpt(md)).toBe("Given an array.\n\nReturn the answer.");
    expect(excerpt("One.\n\nTwo is long.", 6)).toBe("One.");
  });
});

describe("company pick", () => {
  const pl = (c.playlists.find((p) => p.entries.filter((e) => e.problem !== null).length > 30) ?? c.playlists[0]) as Catalog["playlists"][number];

  it("takes the first coding problem from the company set at medium in an unsure topic", () => {
    let hit = 0;
    for (let seed = 0; seed < 40; seed++) {
      const { qs, s } = answerAll(seed, []);
      const item = nextCoding(c, s, qs, [], pl);
      if (!item?.company) continue;
      hit++;
      const inSet = pl.entries.some((e) => e.problem !== null && c.problems[e.problem]?.id === item.problem);
      expect(inSet).toBe(true);
      expect(item.difficulty).toBe("medium");
      expect(byId.get(item.problem)?.difficulty).toBe("medium");
    }
    expect(hit).toBeGreaterThan(0);
  });

  it("falls back to the usual choice without a company, and only picks it first", () => {
    const { qs, s } = answerAll(3, []);
    expect(nextCoding(c, s, qs, [])?.company).toBeUndefined();
    const first = nextCoding(c, s, qs, [], pl);
    if (first) s.coding.push(first);
    expect(nextCoding(c, s, qs, ["clean"], pl)?.company).toBeUndefined();
  });

  it("skips topics answered right", () => {
    const { qs, s } = answerAll(5, qsTopics(5));
    expect(nextCoding(c, s, qs, [], pl)?.company).toBeUndefined();
  });
});
function qsTopics(seed: number) {
  return questions(c, seed).map((q) => q.topic);
}

describe("finding text", () => {
  it("says where each row came from", () => {
    expect(findingText({ source: "coded", grade: "clean", mins: 9 }, "Sliding window")).toBe("You coded sliding window cleanly in 9 minutes");
    expect(findingText({ source: "coded", grade: "clean", mins: 1 }, "Stack")).toBe("You coded stack cleanly in 1 minute");
    expect(findingText({ source: "answered", grade: "skipped" }, "Intervals: sort and sweep")).toMatch(/^You weren't sure which pattern fits .*problems$/);
    expect(findingText({ source: "answered", grade: "failed" }, "Heap")).toContain("wrong pattern");
  });

  it("builds findings from coding and answers, and the summary leads with code", () => {
    const { qs, s } = answerAll(2, []);
    const coding = [{ topic: qs[0]?.topic ?? "", problem: "zz", difficulty: "medium" as const }];
    const fs = findings({ ...s, coding }, qs, ["clean"], [6]);
    expect(fs.zz).toEqual({ source: "coded", grade: "clean", mins: 6 });
    const line = summaryLine(Object.values(fs));
    expect(line.startsWith("You coded")).toBe(true);
    expect(line).toContain("pattern questions covered");
    expect(line.endsWith(".")).toBe(false);
  });
});
