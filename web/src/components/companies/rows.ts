// One row of a company set, rendered at build time (no progress) and again in the page with it.
import { sentenceCase } from "../../lib/display";
import { problemHref } from "../../lib/routes";
import type { Catalog, PlaylistEntry, State } from "../../lib/types";
import { diff, tag, type TagKind } from "../../lib/ui/bits";
import { html, type SafeHtml } from "../../lib/ui/html";
import { icon } from "../../lib/ui/icons";
import { displayRung, ladder } from "../../lib/ui/ladder";

/** Rows after this many are folded behind "Show all N". */
export const SET_FOLD = 16;

export function setRow(c: Catalog, e: PlaylistEntry, rank: number, st?: State, status?: [TagKind, string] | null): SafeHtml {
  const p = e.problem === null ? undefined : c.problems[e.problem];
  const extra = rank > SET_FOLD ? html` class="is-extra"` : "";
  if (!p)
    return html`<li${extra} data-entry="untracked"><a class="qrow" href="${e.url}" target="_blank" rel="noopener"><span class="rank">${rank}</span>
      <div class="qmain"><div class="title">${e.title}</div><div class="sub"><span class="ext">${icon("external-link")}Opens on LeetCode</span></div></div><span></span><span></span><span class="mins"></span></a></li>`;
  const m = c.modules[p.module];
  const where = m?.bank ? "Practice set only" : [sentenceCase(m?.title ?? ""), sentenceCase(m?.techniques[p.technique]?.title ?? "")].filter(Boolean).join(", ");
  const t = m?.bank ? tag("outline", "Not on the Learn map", { dot: false }) : status ? tag(status[0], status[1]) : "";
  return html`<li${extra} data-entry="${p.id}"><a class="qrow" href="${problemHref(p.id)}"><span class="rank">${rank}</span>
    <div class="qmain"><div class="title">${p.title}</div><div class="sub">${t}<span>${where}</span></div></div>
    <span class="ladder-cell">${ladder({ rung: st ? displayRung(st.rung) : 0, due: status?.[0] === "due" })}</span>${diff(p.difficulty, { label: false })}<span class="mins">${Math.round(p.time_target_secs / 60)}m</span></a></li>`;
}
