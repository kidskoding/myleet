import { describe, expect, it } from "vitest";
import { noteWords } from "./build-notes";

describe("noteWords", () => {
  it("counts fenced code apart from prose", () => {
    expect(noteWords("one two three\n```python\nx = 1\n```\nfour")).toEqual({ prose: 4, code: 3 });
  });
});
