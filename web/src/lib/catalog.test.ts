import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { companySlug, fetchNote, fetchProblem, loadCatalog, resetCatalogCache } from "./catalog";
import { fileFetch } from "./test-util";

describe("catalog", () => {
  let calls: string[];
  beforeEach(() => {
    calls = [];
    resetCatalogCache();
    vi.stubGlobal("fetch", fileFetch(calls));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads once and indexes problems by id", async () => {
    const [a, b] = await Promise.all([loadCatalog(), loadCatalog()]);
    expect(a).toBe(b);
    expect(calls).toEqual(["/data/catalog.json"]);
    const twoSum = a.byId.get("two-sum");
    expect(twoSum?.title).toBe("Two Sum");
    const m = a.catalog.modules[twoSum?.module ?? -1];
    expect(m?.techniques[twoSum?.technique ?? -1]?.problems).toContain(a.catalog.problems.indexOf(twoSum!));
  });

  it("does not cache a failed load", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await expect(loadCatalog()).rejects.toThrow("500");
    vi.stubGlobal("fetch", fileFetch(calls));
    await expect(loadCatalog()).resolves.toHaveProperty("text");
  });

  it("fetches problem files and notes", async () => {
    const p = await fetchProblem("two-sum");
    expect(p.starter).toContain("raise NotImplementedError");
    expect(p.test).toContain("from solution import");
    await fetchProblem("two-sum");
    expect(calls.filter((c) => c.includes("two-sum"))).toHaveLength(1);
    expect(await fetchNote("guide/01_how_to_prep.md")).toMatch(/^#/m);
    await expect(fetchNote("../catalog.json")).rejects.toThrow("bad note path");
    await expect(fetchProblem("no-such-problem")).rejects.toThrow("404");
  });

  it("strips the order prefix for company slugs", () => {
    expect(companySlug("001_google")).toBe("google");
    expect(companySlug("google")).toBe("google");
  });
});
