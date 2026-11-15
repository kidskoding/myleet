import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// <body data-nav="plan"> marks the current tab, so a bare [data-nav] in the Plan page's
// click delegate matched every click outside a control (the availability drawer, empty
// space) and set the week offset to Number("plan"), which emptied the week grid.
describe("plan click delegate", () => {
  it("only treats the week arrows as navigation", () => {
    const src = readFileSync(new URL("./plan.ts", import.meta.url), "utf8");
    const sel = src.match(/t\.closest<HTMLElement>\("([^"]+)"\);/)?.[1] ?? "";
    expect(sel).toContain("button[data-nav]");
    expect(sel.split(",")).not.toContain("[data-nav]");
  });
});
