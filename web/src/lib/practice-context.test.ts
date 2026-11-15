import { describe, expect, it } from "vitest";
import { companyPracticeContext, companyProblemHref } from "./practice-context";
import type { Catalog } from "./types";

const catalog = {
  problems: [{ id: "a", title: "First" }, { id: "b", title: "Second" }, { id: "c", title: "Third" }],
  playlists: [{ id: "001_google", title: "Google", entries: [{ problem: 0 }, { problem: null }, { problem: 1 }, { problem: 1 }, { problem: 2 }] }],
} as unknown as Catalog;

describe("company practice navigation", () => {
  it("keeps the company in both directions and skips external and duplicate entries", () => {
    const context = companyPracticeContext(catalog, "b", "google");
    expect(context).toMatchObject({ position: 2, total: 3, backHref: "/companies/google", exitHref: "/companies" });
    expect(context?.previous?.href).toBe(companyProblemHref("a", "google"));
    expect(context?.next?.href).toBe(companyProblemHref("c", "google"));
  });
  it("does not wrap at the start or end", () => {
    expect(companyPracticeContext(catalog, "a", "google")?.previous).toBeNull();
    expect(companyPracticeContext(catalog, "c", "google")?.next).toBeNull();
  });
  it("rejects unknown companies and problems outside the set", () => {
    expect(companyPracticeContext(catalog, "a", "unknown")).toBeNull();
    expect(companyPracticeContext(catalog, "outside", "google")).toBeNull();
    expect(companyPracticeContext(catalog, "a", null)).toBeNull();
  });
});
