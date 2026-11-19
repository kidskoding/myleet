// An interview's topic checklist: each big topic the company's list leans on, ready now,
// solid by a date, practiced but not solid yet, or out of reach before the interview.
// Shown on the Plan page and at the end of onboarding.
import { sentenceCase } from "../display";
import { companyLogo } from "../company-logos";
import type { PrepCover, PrepTopic } from "../types";
import { html, type SafeHtml } from "./html";
import { icon } from "./icons";
import { addDays, localDay } from "../streak";

const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
/** "today" and "tomorrow" read better than a date for the next two days. */
const dayWord = (d: string) => (d === localDay() ? "today" : d === addDays(localDay(), 1) ? "tomorrow" : short(d));

/**
 * The checklist panel: for an interview (`dream` false), measured against its date; for
 * dream companies with no interview near, measured against the plan's last day.
 */
export function prepChecklist(pc: PrepCover, slugs: string[], dream = false): SafeHtml {
  const n = pc.topics.length;
  const ready = pc.topics.filter((t) => t.status === "ready").length;
  const soon = pc.topics.filter((t) => t.status !== "ready" && t.ready_by).length;
  const touched = pc.topics.filter((t) => t.status !== "ready" && !t.ready_by && t.practiced_by).length;
  const missed = n - ready - soon - touched;
  const last = (key: "ready_by" | "practiced_by") => pc.topics.flatMap((t) => (t[key] ? [t[key] as string] : [])).sort().at(-1);
  const when = short(pc.date);
  const now = ready ? `${ready} of ${n} topics ${ready === 1 ? "is" : "are"} ready now` : `None of the ${n} topics are ready yet`;
  const others = ready ? "every other topic" : "every one of them";
  const many = pc.company.includes(" and ");
  const lean = many ? "lean" : "leans";
  const dreamLead =
    ready === n
      ? `Every topic ${pc.company} ${lean} on is ready, so practice now keeps them sharp while you work through more of ${many ? "their" : `${pc.company}'s`} problems`
      : soon && touched
        ? `${now}. By ${when}, the plan gets ${soon === 1 ? "one more" : `${soon} more`} solid and starts practice on ${touched === 1 ? "one more" : `${touched} more`}`
        : soon
          ? `${now}, and the plan gets ${soon === 1 ? "one more" : `${soon} more`} solid by ${when}`
          : touched
            ? `${now}, and the plan starts practice on ${touched === 1 ? "one more" : `${touched} more`} by ${when}`
            : `${now}, and the plan gets to them after your reviews and the topics you're working on now`;
  const lead = dream
    ? dreamLead
    : ready === n
      ? `All ${n} topics ${pc.company} leans on are ready, so the time before ${when} goes to more of ${pc.company}'s problems`
      : missed
        ? `${now}. At your current pace, ${missed === 1 ? "one topic won't" : `${missed} topics won't`} get any practice before your interview on ${when}`
        : touched
          ? `${now}, and ${others} gets practice by ${short(last("practiced_by") ?? pc.date)}. More time each day would make ${touched === 1 ? "that one" : "them"} solid before your interview on ${when}`
          : `${now}, and the plan makes ${ready ? "the rest" : "all of them"} solid by ${short(last("ready_by") ?? pc.date)}, ahead of your interview on ${when}`;
  const row = (t: PrepTopic) => {
    const st = t.status === "ready" ? "ready" : t.ready_by ? "soon" : t.practiced_by ? "touched" : "late";
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
              : `Practice starts ${dayWord(t.practiced_by as string)}, but it won't be solid by ${when}`
            : dream
              ? `The plan reaches it after ${when}`
              : `There's no room to practice it before ${when}`;
    return html`<li class="pg-t pg-${st}${dream && st === "late" ? " pg-later" : ""}"><span class="pg-ic" aria-hidden="true">${st === "ready" ? icon("check") : st === "late" && !dream ? icon("circle-alert") : icon("target")}</span><span class="pg-name">${sentenceCase(t.title)}</span>${pc.today === t.title ? html`<span class="pg-today">Today</span>` : ""}<span class="pg-when">${text}</span></li>`;
  };
  return html`<section class="panel prep-goal" aria-labelledby="pg-h">
    <div class="pg-head"><span class="pg-logos">${slugs.length ? slugs.slice(0, 3).map((s) => companyLogo(s)) : icon("flag")}</span><div><h2 id="pg-h">Your ${pc.company} checklist</h2><p>${lead}</p></div><span class="pg-count" aria-hidden="true"><b>${ready}</b>/${n}</span></div>
    <div class="pg-bar" role="progressbar" aria-label="Topics ready" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${ready}"><span style="width:${((ready / n) * 100).toFixed(0)}%"></span><span class="pg-soon" style="width:${((soon / n) * 100).toFixed(0)}%"></span><span class="pg-touched" style="width:${((touched / n) * 100).toFixed(0)}%"></span></div>
    <ul class="pg-topics">${pc.topics.map(row)}</ul>
  </section>`;
}
