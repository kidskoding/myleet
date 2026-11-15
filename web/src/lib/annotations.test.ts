import { beforeEach, describe, expect, it } from "vitest";
import {
  annotationsFor,
  locate,
  makeAnnotation,
  markNotesSynced,
  markProgress,
  MAX_NOTES_BYTES,
  mergeNotes,
  mergeRemoteNotes,
  minutesLeft,
  notesBlob,
  notesDirty,
  putAnnotation,
  readState,
  removeAnnotation,
} from "./annotations";
import { memoryStorage } from "./memory-storage";

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

const TEXT = "The window grows. The window shrinks while invalid. The window grows again.";

describe("anchoring", () => {
  it("finds the same occurrence by its context after text moves", () => {
    const i = TEXT.indexOf("window", 20);
    const a = makeAnnotation("n.md", TEXT, i, i + 6);
    const edited = `Intro sentence added. ${TEXT}`;
    const at = locate(a, edited);
    expect(at).not.toBeNull();
    expect(edited.slice(at![0] - 4, at![1])).toBe("The window");
    expect(at![0]).toBe(edited.indexOf("window shrinks"));
  });

  it("detaches when the quote is gone", () => {
    const a = makeAnnotation("n.md", TEXT, 4, 10);
    expect(locate(a, "Nothing like it here.")).toBeNull();
  });
});

describe("store", () => {
  it("saves, sorts by position, edits and removes", () => {
    const b = makeAnnotation("n.md", TEXT, 30, 40);
    const a = makeAnnotation("n.md", TEXT, 4, 10);
    putAnnotation(b);
    putAnnotation(a);
    putAnnotation(makeAnnotation("other.md", TEXT, 0, 3));
    expect(annotationsFor("n.md").map((x) => x.id)).toEqual([a.id, b.id]);
    putAnnotation({ ...a, text: "the whole O(n)" });
    expect(annotationsFor("n.md")[0]?.text).toBe("the whole O(n)");
    removeAnnotation(a.id);
    expect(annotationsFor("n.md")).toHaveLength(1);
  });

  it("reading progress never goes backwards and keeps read", () => {
    markProgress("n.md", 0.5);
    markProgress("n.md", 0.2, true);
    expect(readState("n.md")).toMatchObject({ pct: 0.5, read: true });
  });

  it("estimates minutes left at 220 wpm, code at half speed", () => {
    expect(minutesLeft(2200, 0, 0)).toBe(10);
    expect(minutesLeft(2200, 220, 0.5)).toBe(6);
  });
});

describe("account sync", () => {
  const base = () => makeAnnotation("n.md", TEXT, 4, 10, 1_000);

  it("merges by id, the newer edit winning", () => {
    const a = base();
    const older = { ...a, text: "old", updated: 2_000 };
    const newer = { ...a, text: "new", updated: 3_000 };
    const other = makeAnnotation("n.md", TEXT, 30, 40, 1_500);
    const m = mergeNotes({ annotations: [newer], reads: {} }, { annotations: [older, other], reads: {} });
    expect(m.annotations.map((x) => [x.id, x.text]).sort()).toEqual([[a.id, "new"], [other.id, ""]].sort());
    expect(mergeNotes({ annotations: [older], reads: {} }, { annotations: [newer], reads: {} }).annotations[0]?.text).toBe("new");
  });

  it("keeps a removal through a merge and lets an undo win it back", () => {
    const a = base();
    putAnnotation(a, 2_000);
    const remoteCopy = notesBlob();
    removeAnnotation(a.id, 3_000);
    expect(annotationsFor("n.md")).toHaveLength(0);
    // The account still has the highlight from before the removal: it stays removed.
    mergeRemoteNotes(remoteCopy);
    expect(annotationsFor("n.md")).toHaveLength(0);
    expect(notesDirty()).toBe(true);
    // Undo re-saves it as the newest version, which beats the tombstone elsewhere.
    putAnnotation(a, 4_000);
    const tomb = { ...a, quote: "", deleted: true as const, updated: 3_000 };
    expect(mergeNotes({ annotations: [tomb], reads: {} }, JSON.parse(notesBlob()!)).annotations[0]?.deleted).toBeUndefined();
  });

  it("merges reads: furthest scroll, newer read flag", () => {
    const m = mergeNotes({ annotations: [], reads: { "n.md": { pct: 0.8, read: true, at: 1 } } }, { annotations: [], reads: { "n.md": { pct: 0.3, read: false, at: 2 }, "m.md": { pct: 1, read: true, at: 2 } } });
    expect(m.reads["n.md"]).toEqual({ pct: 0.8, read: false, at: 2 });
    expect(m.reads["m.md"]?.read).toBe(true);
  });

  it("tracks what the account lacks", () => {
    expect(notesDirty()).toBe(false);
    putAnnotation(base());
    expect(notesDirty()).toBe(true);
    const sent = notesBlob()!;
    markNotesSynced(sent);
    expect(notesDirty()).toBe(false);
    // Pulling the same copy back is a no-op; a remote-only highlight merges in clean.
    mergeRemoteNotes(sent);
    expect(notesDirty()).toBe(false);
    const theirs = makeAnnotation("n.md", TEXT, 30, 40, 5_000);
    const remote = JSON.stringify({ v: 1, annotations: [...JSON.parse(sent).annotations, theirs], reads: {} });
    mergeRemoteNotes(remote);
    expect(annotationsFor("n.md")).toHaveLength(2);
    expect(notesDirty()).toBe(false);
    // A store from before sync (no flag) with highlights counts as unsynced.
    localStorage.setItem("myleet:notes", JSON.stringify({ annotations: [theirs], reads: {} }));
    expect(notesDirty()).toBe(true);
  });

  it("keeps an oversized store on this device", () => {
    const big = makeAnnotation("n.md", TEXT, 4, 10);
    putAnnotation({ ...big, text: "x".repeat(MAX_NOTES_BYTES) });
    expect(notesBlob()).toBeNull();
  });
});
