import { beforeEach, describe, expect, it } from "vitest";
import { annotationsFor, locate, makeAnnotation, markProgress, minutesLeft, putAnnotation, readState, removeAnnotation } from "./annotations";
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
