import { describe, expect, it } from "vitest";
import { actionFor, chordHandler, keyLabel, type KeyLike } from "./keymap";

const key = (k: string, mods: Partial<KeyLike> = {}): KeyLike => ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods });
const pc = { mac: false, inEditor: true, inField: false };
const mac = { mac: true, inEditor: true, inField: false };
const outside = { mac: false, inEditor: false, inField: false };

describe("workspace keyboard map", () => {
  it("binds the spec's keys with Ctrl on PC and Cmd on Mac", () => {
    expect(actionFor(key("Enter", { ctrlKey: true }), pc)).toBe("run");
    expect(actionFor(key("Enter", { metaKey: true }), mac)).toBe("run");
    expect(actionFor(key("Enter", { ctrlKey: true, shiftKey: true }), pc)).toBe("submit");
    expect(actionFor(key("s", { ctrlKey: true }), pc)).toBe("save");
    expect(actionFor(key("F8"), pc)).toBe("nextProblem");
    expect(actionFor(key("F8", { shiftKey: true }), pc)).toBe("prevProblem");
    expect(actionFor(key("h", { ctrlKey: true }), pc)).toBe("hint");
    expect(actionFor(key("i", { ctrlKey: true }), pc)).toBe("docs");
    expect(actionFor(key(".", { ctrlKey: true }), pc)).toBe("pause");
    expect(actionFor(key("F", { ctrlKey: true, shiftKey: true }), pc)).toBe("focusMode");
    expect(actionFor(key("b", { ctrlKey: true }), pc)).toBe("toggleProblem");
    expect(actionFor(key("j", { ctrlKey: true }), pc)).toBe("toggleTests");
    expect(actionFor(key("F6"), pc)).toBe("nextPane");
    expect(actionFor(key("F6", { shiftKey: true }), pc)).toBe("prevPane");
    expect(actionFor(key("k", { ctrlKey: true }), pc)).toBe("palette");
  });

  it("runs only the custom input from its field", () => {
    expect(actionFor(key("Enter", { ctrlKey: true }), { ...outside, inField: true, inCustomField: true })).toBe("runCustom");
  });

  it("leaves browser-reserved keys, the other platform's modifier and editor keys alone", () => {
    for (const k of ["1", "9", "t", "w", "n", "Tab"]) expect(actionFor(key(k, { ctrlKey: true }), pc)).toBeNull();
    expect(actionFor(key("s", { ctrlKey: true }), mac)).toBeNull();
    expect(actionFor(key("d", { ctrlKey: true }), pc)).toBeNull();
    expect(actionFor(key("/", { ctrlKey: true }), pc)).toBeNull();
    expect(actionFor(key("f", { ctrlKey: true }), pc)).toBeNull();
  });

  it("never takes a bare Esc or ? inside the editor", () => {
    expect(actionFor(key("Escape"), pc)).toBeNull();
    expect(actionFor(key("?"), pc)).toBeNull();
    expect(actionFor(key("Escape"), outside)).toBe("escape");
    expect(actionFor(key("?", { shiftKey: true }), outside)).toBe("shortcuts");
    expect(actionFor(key("?"), { ...outside, inField: true })).toBeNull();
  });

  it("only offers docs at the cursor inside the editor", () => {
    expect(actionFor(key("i", { ctrlKey: true }), outside)).toBeNull();
  });

  it("goes back to Today on g then t, outside the editor and in time", () => {
    const chord = chordHandler(1000);
    expect(chord(key("g"), outside, 0)).toBeNull();
    expect(chord(key("t"), outside, 500)).toBe("back");
    expect(chord(key("g"), outside, 0)).toBeNull();
    expect(chord(key("t"), outside, 2000)).toBeNull();
    expect(chord(key("g"), pc, 0)).toBeNull();
    expect(chord(key("t"), pc, 10)).toBeNull();
  });

  it("labels keys per platform", () => {
    expect(keyLabel("⌘⇧↵", true)).toBe("⌘⇧↵");
    expect(keyLabel("⌘⇧↵", false)).toBe("Ctrl+Shift+Enter");
    expect(keyLabel("⌘D / ⌘⇧L", false)).toBe("Ctrl+D / Ctrl+Shift+L");
  });
});
