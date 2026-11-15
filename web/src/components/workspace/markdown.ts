// Markdown to safe prose HTML for statements: raw HTML in the markdown is shown as text,
// never parsed, and `10^5` reads as a superscript. Used at build time and, lazily, in the page.

import { Marked } from "marked";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const md = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, text }) {
      const safe = /^(https?:|mailto:|\/|#)/i.test(href) ? href : "#";
      return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener">${text}</a>`;
    },
    image({ text }) {
      return escapeHtml(text);
    },
  },
});

/** Markdown to safe HTML; `10^5` reads as a superscript. */
export function renderMarkdown(src: string): string {
  const html = md.parse(src, { async: false });
  // Superscripts outside code: the Worker writes 10<sup>4</sup> as 10^4.
  return html.replace(/(<code>[\s\S]*?<\/code>|<pre>[\s\S]*?<\/pre>)|(\d)\^(-?\d+)/g, (m, code: string | undefined, base: string, exp: string) =>
    code ? m : `${base}<sup>${exp}</sup>`,
  );
}
