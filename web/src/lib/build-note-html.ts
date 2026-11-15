// Build-time only: a note's markdown to reader HTML. Python blocks get the editor's syntax
// classes and a toolbar; headings get ids for the contents; raw HTML is shown as text.
import { posix } from "node:path";
import { Marked, type Tokens } from "marked";
import { highlightLines } from "./editor/highlight";
import { sentenceCase } from "./display";
import { noteWords } from "./build-notes";
import { noteHref } from "./routes";

export interface NoteHeading {
  id: string;
  text: string;
}

export interface RenderedNote {
  title: string | null;
  html: string;
  headings: NoteHeading[];
  prose: number;
  code: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COPY = '<button class="btn btn-ghost btn-sm" type="button" data-copy aria-label="Copy code">Copy</button>';

/** `notePath` resolves relative links between notes (`../../07_trees/notes/02_dfs.md#x`). */
export function renderNote(md: string, notePath = ""): RenderedNote {
  let title: string | null = null;
  const headings: NoteHeading[] = [];
  const used = new Set<string>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      html({ text }) {
        return esc(text);
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        const rel = /^[^:/#][^:]*\.md(#.*)?$/i.exec(href);
        const local = rel ? noteHref(posix.normalize(posix.join(posix.dirname(notePath), href.replace(/#.*$/, "")))) + (rel[1] ?? "") : null;
        const safe = local ?? (/^(https?:|mailto:|\/|#)/i.test(href) ? href : "#");
        const ext = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${esc(safe)}"${ext}>${text}</a>`;
      },
      image({ text }) {
        return esc(text);
      },
      heading({ tokens, depth, text }: Tokens.Heading) {
        if (depth === 1) {
          title ??= text;
          return "";
        }
        const plain = tokens.every((t) => t.type === "text");
        const inner = plain ? esc(sentenceCase(text)) : this.parser.parseInline(tokens);
        let id = slug(text) || "section";
        for (let i = 2; used.has(id); i++) id = `${slug(text)}-${i}`;
        used.add(id);
        if (depth === 2) headings.push({ id, text: inner.replace(/<[^>]+>/g, "") });
        return `<h${depth} id="${id}">${inner}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>`;
      },
      code({ text, lang }: Tokens.Code) {
        const l = (lang ?? "").trim().toLowerCase();
        if (l === "python") {
          const runs = /^\s*assert\b/m.test(text);
          const body = highlightLines(text).join("\n");
          const tools = `<div class="code-tools"><span>${runs ? "Python, runs as written" : "Python"}</span>${runs ? '<button class="btn btn-ghost btn-sm" type="button" data-try>Try it</button>' : ""}${COPY}</div>`;
          return `<div class="codeblock" data-lang="python">${tools}<pre><code>${body}</code></pre></div>`;
        }
        if (l === "mermaid") {
          return `<div class="codeblock" data-lang="mermaid"><div class="code-tools"><span>Diagram, as Mermaid source</span>${COPY}</div><pre><code>${esc(text)}</code></pre></div>`;
        }
        return `<pre><code>${esc(text)}</code></pre>`;
      },
    },
  });
  const html = marked.parse(md, { async: false });
  const w = noteWords(md);
  return { title, html, headings, prose: w.prose, code: w.code };
}
