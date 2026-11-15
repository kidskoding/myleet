import { describe, expect, it } from "vitest";
import { ladder } from "./ladder";

describe("expressive ladder", () => {
  it("draws five rung guides, the route to the current rung and the next rung dashed", () => {
    const s = ladder({ rung: 2, size: "xl", due: true }).value;
    expect(s.match(/class="guide"/g)).toHaveLength(5);
    expect(s).toContain('class="node current due"');
    expect(s).toContain('class="node next"');
    expect(s).toContain('class="route"');
    expect(s).toContain('aria-label="On level 2 of 5, review due"');
  });

  it("marks a climb, skips the next rung when asked, and gives each gradient its own id", () => {
    const a = ladder({ rung: 3, size: "xl", climbed: true, next: false }).value;
    const b = ladder({ rung: 3, size: "xl" }).value;
    expect(a).toMatch(/^<span class="ladder-xl climbed"/);
    expect(a).not.toContain("next-seg");
    expect(a.match(/id="(lx-r\d+)"/)?.[1]).not.toBe(b.match(/id="(lx-r\d+)"/)?.[1]);
  });

  it("has no route or halo before the first solve", () => {
    const s = ladder({ rung: 0, size: "xl" }).value;
    expect(s).not.toContain('class="route"');
    expect(s).not.toContain("halo");
  });
});
