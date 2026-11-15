import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "../prefs";
import { fromPrefs, toPrefs } from "./settings";

describe("editor settings", () => {
  it("round-trips the shared editor prefs", () => {
    const s = fromPrefs(DEFAULT_PREFS.editor);
    expect(s).toMatchObject({ vim: false, tabSize: 4, wrap: false, autocomplete: true });
    expect(toPrefs(s)).toEqual(DEFAULT_PREFS.editor);
    expect(toPrefs({ ...s, vim: true, tabSize: 2 })).toMatchObject({ keymap: "vim", indent: 2 });
  });

  it("clamps the font size", () => {
    expect(fromPrefs({ ...DEFAULT_PREFS.editor, fontSize: 40 }).fontSize).toBe(18);
    expect(fromPrefs({ ...DEFAULT_PREFS.editor, fontSize: 2 }).fontSize).toBe(12);
  });
});
