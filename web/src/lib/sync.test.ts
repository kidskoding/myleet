import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "./memory-storage";
import { appendEvent, clearEvents, readEvents, resetProgressStore, type PutOutcome, type RemoteProgress, type SyncTransport } from "./progress";
import { clearDevice, createSyncer, decideLater, deferredMerge, discardDeviceAndPull, firstSync, isLinked, mergeIntoAccount, unlinkDevice } from "./sync";

const ev = (t: string, problem = "two-sum") => JSON.stringify({ t, kind: "passed", problem, attempt: t, mode: "practice" });
const A = ev("2026-11-14T10:00:00Z");
const B = ev("2026-11-14T11:00:00Z", "valid-anagram");
const C = ev("2026-11-13T09:00:00Z", "contains-duplicate");

function fakeServer(start: RemoteProgress = { events_jsonl: "", version: 0 }) {
  const s = { ...start, puts: 0, gets: 0 };
  const transport: SyncTransport = {
    get: async () => (s.gets++, { events_jsonl: s.events_jsonl, version: s.version }),
    put: async (base, events): Promise<PutOutcome> => {
      s.puts++;
      if (base !== s.version) return { ok: false, current: { events_jsonl: s.events_jsonl, version: s.version } };
      s.events_jsonl = events;
      s.version++;
      return { ok: true, version: s.version };
    },
  };
  return { s, transport };
}

describe("first sign-in", () => {
  beforeEach(async () => {
    globalThis.localStorage = memoryStorage();
    resetProgressStore();
    await clearEvents();
  });

  it("uploads quietly when the account is empty", async () => {
    await appendEvent(A);
    const { s, transport } = fakeServer();
    expect(await firstSync(transport, "u1")).toEqual({ kind: "uploaded" });
    expect(s.events_jsonl).toContain("two-sum");
    expect(isLinked("u1")).toBe(true);
  });

  it("pulls quietly when this device has nothing", async () => {
    const { transport } = fakeServer({ events_jsonl: `${C}\n`, version: 3 });
    expect(await firstSync(transport, "u1")).toEqual({ kind: "synced" });
    expect(await readEvents()).toContain("contains-duplicate");
  });

  it("asks before merging when both sides have history, then keeps both", async () => {
    await appendEvent(A);
    const { s, transport } = fakeServer({ events_jsonl: `${C}\n${B}\n`, version: 2 });
    const r = await firstSync(transport, "u1");
    expect(r.kind).toBe("merge");
    expect(s.puts).toBe(0);
    expect(isLinked("u1")).toBe(false);
    const merged = await mergeIntoAccount(transport, "u1");
    for (const id of ["two-sum", "valid-anagram", "contains-duplicate"]) {
      expect(merged).toContain(id);
      expect(s.events_jsonl).toContain(id);
    }
    expect(merged.indexOf("contains-duplicate")).toBeLessThan(merged.indexOf("two-sum"));
    expect(isLinked("u1")).toBe(true);
  });

  it("decide later keeps the device local until the learner merges", async () => {
    await appendEvent(A);
    const { s, transport } = fakeServer({ events_jsonl: `${C}\n`, version: 1 });
    expect((await firstSync(transport, "u1")).kind).toBe("merge");
    decideLater("u1");
    expect(deferredMerge("u1")).toBe(true);
    expect(isLinked("u1")).toBe(false);
    expect(await firstSync(transport, "u1")).toEqual({ kind: "deferred" });
    expect(s.puts).toBe(0);
  });

  it("discarding the device replaces local progress with the account's", async () => {
    await appendEvent(A);
    const { transport } = fakeServer({ events_jsonl: `${C}\n`, version: 1 });
    await firstSync(transport, "u1");
    const text = await discardDeviceAndPull(transport, "u1");
    expect(text).toContain("contains-duplicate");
    expect(text).not.toContain("two-sum");
  });

  it("a different account starts over as a first sign-in", async () => {
    await appendEvent(A);
    const one = fakeServer();
    await firstSync(one.transport, "u1");
    unlinkDevice();
    const two = fakeServer({ events_jsonl: `${C}\n`, version: 5 });
    expect((await firstSync(two.transport, "u2")).kind).toBe("merge");
    expect(two.s.puts).toBe(0);
  });
});

describe("createSyncer", () => {
  it("coalesces requests and reports failures", async () => {
    let runs = 0;
    const states: boolean[] = [];
    let fail = false;
    const s = createSyncer(
      async () => {
        runs++;
        if (fail) throw new Error("down");
      },
      (st) => states.push(st.ok),
      5,
    );
    s.request();
    s.request();
    s.request();
    await new Promise((r) => setTimeout(r, 30));
    expect(runs).toBe(1);
    fail = true;
    s.request(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(states).toEqual([true, false]);
  });
});

describe("clearDevice", () => {
  it("a reset keeps the sign-in and theme, a deleted account keeps only the theme, other sites' keys stay", () => {
    for (const keep of [true, false]) {
      globalThis.localStorage = memoryStorage();
      globalThis.sessionStorage = memoryStorage();
      for (const k of ["myleet:me", "myleet:auth", "myleet:theme", "myleet:prefs", "myleet:progress", "other:key"]) localStorage.setItem(k, "x");
      sessionStorage.setItem("myleet:gcal", "x");
      clearDevice(keep);
      expect(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).sort()).toEqual((keep ? ["myleet:auth", "myleet:me", "myleet:theme", "other:key"] : ["myleet:theme", "other:key"]).sort());
      expect(sessionStorage.length).toBe(0);
    }
  });
});
