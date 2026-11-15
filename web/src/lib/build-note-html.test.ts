import { describe, expect, it } from "vitest";
import { renderNote } from "./build-note-html";

const MD = `# Variable Window

See [the DFS note](../../07_trees/notes/02_dfs.md#base-case) and [next](03_x.md).

## The Condition Must Move

\`\`\`python
def f(x: int) -> int:
    return x


assert f(1) == 1
\`\`\`

<script>alert(1)</script>
`;

describe("renderNote", () => {
  const r = renderNote(MD, "curriculum/04_sliding_window/notes/02_variable_size_window.md");
  it("takes the title, ids the h2s and sentence-cases them", () => {
    expect(r.title).toBe("Variable Window");
    expect(r.headings).toEqual([{ id: "the-condition-must-move", text: "The condition must move" }]);
  });
  it("resolves links between notes to reader URLs", () => {
    expect(r.html).toContain('href="/notes/curriculum/07_trees/notes/02_dfs#base-case"');
    expect(r.html).toContain('href="/notes/curriculum/04_sliding_window/notes/03_x"');
  });
  it("gives runnable Python a Try it toolbar and escapes raw HTML", () => {
    expect(r.html).toContain("Python, runs as written");
    expect(r.html).toContain('class="sk"');
    expect(r.html).not.toContain("<script>");
  });
});
