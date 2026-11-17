import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./test-util";
import { moduleOneStart } from "./diagnostic";
import { createTrainer } from "./trainer";

const catalogText = readFileSync(join(ROOT, "public/data/catalog.json"), "utf8");
const t = createTrainer(catalogText, { module: readFileSync(join(ROOT, "src/wasm/myleet_wasm_bg.wasm")) });
const NOW = Date.parse("2026-11-14T15:00:00Z");

describe("trainer", () => {
  it("offers new problems to a fresh learner", () => {
    const today = t.today("", { now: NOW, tz: "UTC" });
    expect(today.length).toBeGreaterThan(0);
    expect(today.every((e) => e.state.status === "unseen")).toBe(true);
  });

  it("builds event lines the scheduler reads back", () => {
    const attempt = t.newAttemptId();
    expect(attempt).toMatch(/^[0-9a-f]{12}$/);
    const lines = [
      t.eventLine({ kind: "opened", problem: "two-sum", attempt, mode: "practice", now: NOW }),
      t.eventLine({ kind: "passed", problem: "two-sum", attempt, mode: "practice", data: { elapsed_ms: "60000" }, now: NOW + 60_000 }),
    ];
    for (const l of lines) expect(l).not.toContain("\n");
    const events = lines.map((l) => `${l}\n`).join("");
    const s = t.states(events, "UTC")["two-sum"];
    expect(s?.attempts).toBe(1);
    expect(s?.status).not.toBe("unseen");
    expect(t.stats(events, { now: NOW + 60_000, tz: "UTC" }).counts.unseen).toBeGreaterThan(0);
    expect(t.saveFile(events, "UTC")).toContain("two-sum");
  });

  it("wraps the free helpers", () => {
    expect(t.formatSecs(252)).toBe("4m12s");
    expect(t.interviewRules().round_secs).toBeGreaterThan(0);
    expect(t.placement("").needs).toBeTypeOf("boolean");
    expect(t.interviewPick("", 2, 7, { now: NOW, tz: "UTC" })).toHaveLength(2);
    expect(() => createTrainer("{")).toThrow();
  });

  it("counts a skipped diagnostic as done, starting at module 1", () => {
    expect(t.placement("").needs).toBe(true);
    const skipped = `${t.placementSkip(NOW)}\n`;
    expect(t.placement(skipped).needs).toBe(false);
    expect(t.placement(skipped).done).toBe(true);
    expect(moduleOneStart(JSON.parse(catalogText))).toBe("two-sum");
  });
});
