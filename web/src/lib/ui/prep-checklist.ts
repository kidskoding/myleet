// An interview's topic checklist: each big topic the company's list leans on, ready now,
// solid by a date, practiced but not solid yet, or out of reach before the interview.
// A compact card beside the Plan headline and at the end of onboarding.
import { sentenceCase } from "../display";
import { companyLogo } from "../company-logos";
import type { PrepCover, PrepTopic } from "../types";
import { html, type SafeHtml } from "./html";
import { icon } from "./icons";
import { addDays, localDay } from "../streak";

const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
/** "today" and "tomorrow" read better than a date for the next two days. */
const dayWord = (d: string) => (d === localDay() ? "today" : d === addDays(localDay(), 1) ? "tomorrow" : short(d));
/** Topics the card lists before "See all". */
const FIRST = 4;

type State = "ready" | "soon" | "touched" | "late";
const state = (t: PrepTopic): State => (t.status === "ready" ? "ready" : t.ready_by ? "soon" : t.practiced_by ? "touched" : "late");

/**
 * The checklist card: for an interview (`dream` false), measured against its date; for
 * dream companies with no interview near, measured against the plan's last day.
 */
export function prepChecklist(pc: PrepCover, slugs: string[], dream = false): SafeHtml {
  const n = pc.topics.length;
  const count = (s: State) => pc.topics.filter((t) => state(t) === s).length;
  const ready = count("ready");
  const soon = count("soon");
  const touched = count("touched");
  const missed = count("late");
  const last = (key: "ready_by" | "practiced_by") => pc.topics.flatMap((t) => (t[key] ? [t[key] as string] : [])).sort().at(-1);
  const when = short(pc.date);
  const many = pc.company.includes(" and ");
  // "3 more" after some are ready, "3 of them" when none are yet.
  const more = (k: number) => (ready ? (k === 1 ? "one more" : `${k} more`) : k === 1 ? "one of them" : `${k} of them`);
  const others = (k: number) => (k === 1 ? "one other" : `${k} others`);
  // The count above says how many are ready; the sentence says what happens next.
  const lead = dream
    ? ready === n
      ? `Practice now keeps them sharp while you work through more of ${many ? "their" : `${pc.company}'s`} problems`
      : soon && touched
        ? `By ${when}, the plan gets ${more(soon)} solid and starts practice on ${others(touched)}`
        : soon
          ? `By ${when}, the plan gets ${more(soon)} solid`
          : touched
            ? `By ${when}, the plan starts practice on ${more(touched)}`
            : "The plan gets to them after your reviews and the topics you're working on now"
    : ready === n
      ? `The time before ${when} goes to more of ${pc.company}'s problems`
      : missed
        ? `At your current pace, ${missed === 1 ? "one topic won't" : `${missed} topics won't`} get any practice before ${when}`
        : touched
          ? `${ready ? "Every other topic" : "Every topic"} gets practice by ${short(last("practiced_by") ?? pc.date)}, and more time each day would make ${touched === 1 ? "that one" : "them"} solid before ${when}`
          : `The plan makes ${ready ? "the rest" : "all of them"} solid by ${short(last("ready_by") ?? pc.date)}, ahead of ${when}`;
  const row = (t: PrepTopic) => {
    const st = state(t);
    const text =
      st === "ready"
        ? t.from_leetcode
          ? "Ready, based on your LeetCode history"
          : "Ready"
        : st === "soon"
          ? `${t.status === "started" ? "In progress and solid" : "Solid"} by ${dayWord(t.ready_by as string)}`
          : st === "touched"
            ? dream
              ? `Practice starts ${dayWord(t.practiced_by as string)}`
              : `Practice starts ${dayWord(t.practiced_by as string)} but won't be solid by ${when}`
            : dream
              ? `The plan reaches it after ${when}`
              : `There's no room for it before ${when}`;
    const calm = dream && st === "late";
    return html`<li class="pg-t pg-${st}${calm ? " pg-later" : ""}"><span class="pg-ic" aria-hidden="true">${st === "ready" ? icon("check") : st === "late" && !calm ? icon("circle-alert") : icon("target")}</span><span class="pg-name">${sentenceCase(t.title)}</span>${pc.today === t.title ? html`<span class="pg-today">Today</span>` : ""}<span class="pg-when">${text}</span></li>`;
  };
  // What's coming first, then what's ready, then what's further out.
  const rank: Record<State, number> = { soon: 0, touched: 1, late: 2, ready: 3 };
  const order = [...pc.topics].sort((a, b) => rank[state(a)] - rank[state(b)] || (a.ready_by ?? a.practiced_by ?? "").localeCompare(b.ready_by ?? b.practiced_by ?? ""));
  // An interview's warnings stay in view; everything else waits behind "See all".
  const pinned = dream ? [] : order.filter((t) => state(t) === "late");
  const first = [...pinned, ...order.filter((t) => !pinned.includes(t))].slice(0, Math.max(FIRST, pinned.length));
  const rest = order.filter((t) => !first.includes(t));
  const names = pc.company.split(/, | and /).length;
  const title = dream ? (names > 2 ? "Dream company topics" : `${pc.company} topics`) : `${pc.company} interview, ${when}`;
  return html`<section class="panel prep-goal" aria-labelledby="pg-h">
    <div class="pg-head"><span class="pg-logos">${slugs.length ? slugs.slice(0, 3).map((s) => companyLogo(s)) : icon("flag")}</span><h2 id="pg-h">${title}</h2></div>
    <p class="pg-count"><b>${ready}</b> of ${n} topics ready</p>
    <div class="pg-bar" role="progressbar" aria-label="Topics ready" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${ready}"><span style="width:${((ready / n) * 100).toFixed(0)}%"></span><span class="pg-soon" style="width:${((soon / n) * 100).toFixed(0)}%"></span><span class="pg-touched" style="width:${((touched / n) * 100).toFixed(0)}%"></span></div>
    <p class="pg-lead">${lead}</p>
    <ul class="pg-topics">${first.map(row)}</ul>
    ${rest.length ? html`<details class="pg-more"><summary>See all ${n} topics</summary><ul class="pg-topics">${rest.map(row)}</ul></details>` : ""}
  </section>`;
}
