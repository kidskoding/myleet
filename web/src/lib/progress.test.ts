import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendEvent,
  autosaver,
  clearEvents,
  deleteDraft,
  importEvents,
  loadDraft,
  mergeEvents,
  readEvents,
  readMeta,
  resetProgressStore,
  saveDraft,
  syncProgress,
  type PutOutcome,
  type RemoteProgress,
  type SyncTransport,
} from "./progress";
import { annotationsFor, makeAnnotation, notesDirty, putAnnotation } from "./annotations";
import { memoryStorage } from "./memory-storage";

const ev = (t: string, kind = "opened") => JSON.stringify({ t, kind, problem: "two-sum", attempt: "a", mode: "practice" });
const A = ev("2026-11-14T10:00:00Z");
const B = ev("2026-11-14T11:00:00Z", "passed");
const C = ev("2026-11-14T12:00:00Z", "test_run");

/** An in-memory Worker /api/progress with its optimistic version check. */
function fakeServer(start: RemoteProgress = { events_jsonl: "", version: 0 }) {
  const s = { notes_json: null as string | null, ...start, puts: 0 };
  const transport: SyncTransport = {
    get: async () => ({ events_jsonl: s.events_jsonl, version: s.version, notes_json: s.notes_json }),
    put: async (base, events, notes): Promise<PutOutcome> => {
      s.puts++;
      if (base !== s.version) return { ok: false, current: { events_jsonl: s.events_jsonl, version: s.version, notes_json: s.notes_json } };
      s.events_jsonl = events;
      if (notes) s.notes_json = notes;
      s.version++;
      return { ok: true, version: s.version };
    },
  };
  return { s, transport };
}

describe("mergeEvents", () => {
  it("unions lines and sorts by time", () => {
    expect(mergeEvents(`${C}\n${A}\n`, `${B}\n${A}\n\n`)).toBe(`${A}\n${B}\n${C}\n`);
  });
  it("keeps unreadable lines at the end and same-time lines in order", () => {
    const A2 = ev("2026-11-14T10:00:00Z", "left");
    expect(mergeEvents(`not json\n${A2}`, A)).toBe(`${A2}\n${A}\nnot json\n`);
  });
});

describe("progress store", () => {
  beforeEach(async () => {
    globalThis.localStorage = memoryStorage();
    resetProgressStore();
    await clearEvents();
    await deleteDraft("two-sum");
  });

  it("appends lines and marks them unsynced", async () => {
    expect(await readEvents()).toBe("");
    await Promise.all([appendEvent(A), appendEvent(B)]);
    expect((await readEvents()).split("\n").filter(Boolean).sort()).toEqual([A, B].sort());
    expect(await readMeta()).toEqual({ version: 0, dirty: true });
    await expect(appendEvent(`${A}\n${B}`)).rejects.toThrow();
  });

  it("imports by merging, never replacing", async () => {
    await appendEvent(B);
    expect(await importEvents(`${A}\n${C}\n`)).toBe(`${A}\n${B}\n${C}\n`);
  });

  it("pushes local lines, then merges on a 409 and retries", async () => {
    const { s, transport } = fakeServer({ events_jsonl: `${B}\n`, version: 3 });
    await appendEvent(A);
    await appendEvent(C);
    const out = await syncProgress(transport);
    expect(out).toBe(`${A}\n${B}\n${C}\n`);
    expect(s.events_jsonl).toBe(out);
    expect(s.puts).toBe(2);
    expect(await readMeta()).toEqual({ version: 4, dirty: false });
  });

  it("pulls newer server lines when clean, without a write", async () => {
    const { s, transport } = fakeServer();
    await appendEvent(A);
    await syncProgress(transport);
    s.events_jsonl = `${A}\n${B}\n`;
    s.version = 7;
    const puts = s.puts;
    expect(await syncProgress(transport)).toBe(`${A}\n${B}\n`);
    expect(s.puts).toBe(puts);
    expect(await readMeta()).toEqual({ version: 7, dirty: false });
  });

  it("carries reader notes on the same write and merges them on a 409", async () => {
    const TEXT = "The window grows. The window shrinks.";
    const theirs = makeAnnotation("n.md", TEXT, 4, 10, 1_000);
    const { s, transport } = fakeServer({ events_jsonl: `${A}\n`, version: 2, notes_json: JSON.stringify({ v: 1, annotations: [theirs], reads: {} }) });
    putAnnotation(makeAnnotation("n.md", TEXT, 22, 28, 2_000));
    // Only notes changed: one PUT (after the 409 merge), events untouched.
    await syncProgress(transport);
    expect(annotationsFor("n.md")).toHaveLength(2);
    expect((JSON.parse(s.notes_json ?? "{}") as { annotations: unknown[] }).annotations).toHaveLength(2);
    expect(s.events_jsonl).toBe(`${A}\n`);
    expect(notesDirty()).toBe(false);
    const puts = s.puts;
    await syncProgress(transport);
    expect(s.puts).toBe(puts);
  });

  it("saves, autosaves and deletes drafts", async () => {
    await saveDraft("two-sum", "x = 1");
    expect((await loadDraft("two-sum"))?.code).toBe("x = 1");
    vi.useFakeTimers();
    const a = autosaver("two-sum", 100);
    a.save("x = 2");
    a.save("x = 3");
    await vi.advanceTimersByTimeAsync(150);
    vi.useRealTimers();
    expect((await loadDraft("two-sum"))?.code).toBe("x = 3");
    await deleteDraft("two-sum");
    expect(await loadDraft("two-sum")).toBeUndefined();
  });
});
