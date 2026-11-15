import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { resetProgressStore, saveDraft, loadDraft } from "../progress";
import { addToHistory, draftHistory, loadSnapshot, opening, pushHistory, saveSnapshot, DRAFT_HISTORY } from "./drafts";

const STARTER = "def f():\n    raise NotImplementedError\n";

beforeEach(async () => {
  resetProgressStore();
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase("myleet");
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
});

describe("drafts", () => {
  it("restores an edited draft with its time, and ignores one equal to the starter", () => {
    expect(opening(STARTER, { code: "def f():\n    return 1\n", savedAt: 5 }, false)).toEqual({ code: "def f():\n    return 1\n", banner: { kind: "draft", savedAt: 5 } });
    expect(opening(STARTER, { code: `${STARTER}\n`, savedAt: 5 }, false)).toEqual({ code: STARTER, banner: null });
    expect(opening(STARTER, undefined, false)).toEqual({ code: STARTER, banner: null });
  });

  it("opens a review fresh and points at History", () => {
    expect(opening(STARTER, { code: "x = 1\n", savedAt: 5 }, true)).toEqual({ code: STARTER, banner: { kind: "review" } });
    expect(opening(STARTER, undefined, true)).toEqual({ code: STARTER, banner: null });
  });

  it("round-trips the live draft through the progress store", async () => {
    await saveDraft("p", "x = 1\n");
    const d = await loadDraft("p");
    expect(d?.code).toBe("x = 1\n");
    expect(opening(STARTER, d, false).code).toBe("x = 1\n");
  });

  it("keeps the last ten drafts, newest first, without repeats", async () => {
    let list = pushHistory([], "a", 1);
    list = pushHistory(list, "a", 2);
    expect(list).toHaveLength(1);
    for (let i = 0; i < 15; i++) await addToHistory("p", `v${i}`, i);
    const saved = await draftHistory("p");
    expect(saved).toHaveLength(DRAFT_HISTORY);
    expect(saved[0]?.code).toBe("v14");
    expect(await loadDraft("p")).toBeUndefined();
  });

  it("stores a snapshot per attempt", async () => {
    await saveSnapshot("p", "abc", "code\n");
    expect((await loadSnapshot("p", "abc"))?.code).toBe("code\n");
    expect(await loadSnapshot("p", "zzz")).toBeUndefined();
  });
});
