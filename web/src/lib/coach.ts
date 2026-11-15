// Today's personal copy: the coaching paragraph, the "for you" cards, the on-this-day line,
// milestones and momentum. Pure, so it is tested; every piece returns null without data.
import { addDays, localDay } from "./streak";
import { midSentence } from "./schedule";
import { RUNG_DAYS } from "./ui/ladder";
import type { PlanItem, Skill, SkillAttempt, State, TodayEntry } from "./types";

/** What a level change means to the learner, as a clause about `tech`. */
const LEVEL_OUTCOME: Record<string, (tech: string) => string> = {
  shaky: (t) => `you'll stop needing hints on ${t}`,
  building: (t) => `${t} will start to feel solid`,
  solid: (t) => `you'll be able to do ${t} under interview time pressure`,
};
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const num = (n: number) => NUM[n] ?? String(n);
const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Yesterday", "3 days ago", "Earlier today" for a YYYY-MM-DD against today. */
export function dayAgo(date: string, now: Date): string {
  const today = localDay(now);
  if (date >= today) return "earlier today";
  if (date === addDays(today, -1)) return "yesterday";
  const n = Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
  return n === 7 ? "a week ago" : `${n} days ago`;
}

/** What an attempt shows, as a verb phrase: "passed 5 of 7 tests and missed edge cases". */
export function attemptPhrase(a: Pick<SkillAttempt, "mark" | "cause" | "detail">): string | null {
  if (a.mark === "hint") return a.detail.includes("solution") ? "looked at the solution" : "needed a hint";
  if (a.mark === "over") return `solved it but took ${a.detail}`;
  if (a.mark !== "missed") return null;
  if (!a.detail.startsWith("passed")) return "got stuck before a test passed";
  const why = a.cause === "edge_cases" ? " but missed edge cases" : a.cause === "wrong_approach" ? " after starting down the wrong approach" : "";
  return `${a.detail}${why}`;
}

/** The most recent non-clean attempt within `withinDays`. */
function recentMiss(s: Skill | undefined, now: Date, withinDays = 7): SkillAttempt | undefined {
  const since = addDays(localDay(now), -withinDays);
  return [...(s?.history ?? [])].reverse().find((h) => h.mark !== "clean" && h.date >= since);
}

export interface SummaryInput {
  items: Pick<PlanItem, "kind" | "tag" | "technique" | "chips">[];
  skills: Skill[] | null;
  daysLeft: number | null;
  now: Date;
}

/**
 * The coaching paragraph under the greeting: the day's theme (its most common technique),
 * why it matters to this learner, and how the day runs. Null with nothing queued.
 */
/** Today's coaching note; like all UI text it never ends on a period. */
export function todaySummary(input: SummaryInput): string | null {
  return summaryText(input)?.replace(/\.$/, "") ?? null;
}

function summaryText({ items, skills, daysLeft, now }: SummaryInput): string | null {
  const counts = new Map<string, number>();
  for (const i of items) if (i.technique && i.kind !== "review") counts.set(i.technique, (counts.get(i.technique) ?? 0) + 1);
  const [theme, nTheme = 0] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  const reviews = items.filter((i) => i.kind === "review").length;
  const nNew = items.filter((i) => i.kind !== "review").length;
  if (!theme) return reviews ? `Today is a review day, with ${num(reviews)} older ${reviews === 1 ? "problem" : "problems"} to keep on schedule.` : null;
  const near = daysLeft !== null && daysLeft > 0 && daysLeft <= 30 ? daysLeft : null;
  // One problem each from several techniques: no theme to claim, so say what the day holds.
  if (nTheme === 1 && counts.size > 1) {
    const techs = [...counts.keys()].map(midSentence);
    const topics = `${techs.slice(0, -1).join(", ")} and ${techs.at(-1)}`;
    const lead = reviews ? `Today starts with ${num(reviews)} ${reviews === 1 ? "review" : "reviews"} to keep on schedule, then ${num(nNew)} new problems in ${topics}` : `Today spreads ${num(nNew)} new problems across ${topics}`;
    return `${lead}${near ? `, with your interview ${days(near)} away` : ""}.`;
  }

  const tech = midSentence(theme);
  const skill = skills?.find((s) => s.technique_title === theme);
  const weak = items.some((i) => i.technique === theme && i.tag === "weak") || !!skill?.weak_spot;
  const company = items
    .filter((i) => i.technique === theme)
    .flatMap((i) => i.chips ?? [])
    .map((c) => /^(.+) leans on /.exec(c.text)?.[1])
    .find(Boolean);
  const out: string[] = [];

  out.push(`Today we're ${weak ? "focusing on" : "spending most of our time on"} ${tech}${weak ? ", your weakest spot right now" : ""}.`);

  const miss = recentMiss(skill, now);
  const did = miss && attemptPhrase(miss);
  if (miss && did) out.push(`${cap(dayAgo(miss.date, now))} on ${miss.title} you ${did}.`);
  if (company) out.push(`${company}'s set leans on ${tech}${near ? ` and your interview is ${days(near)} away` : ""}, so it's likely to come up.`);
  else if (near) out.push(`Your interview is ${days(near)} away${weak ? ", and it's the topic you've struggled with most" : ""}.`);

  const level = skill?.level;
  const outcome = level ? LEVEL_OUTCOME[level]?.(tech) : undefined;
  const work = nTheme === 1 ? `one ${tech} problem` : `${num(nTheme)} ${tech} problems`;
  const more = nNew - nTheme;
  const extra = more > 0 ? ` and then work through ${more === 1 ? "one more from another topic" : `${num(more)} more from other topics`}` : "";
  const run = reviews ? `warm up with ${reviews === 1 ? "a quick review" : `${num(reviews)} quick reviews`}, then work through ${work}${extra.replace(" and then work through", " and")}` : `start with ${work}${extra}`;
  const move = outcome ? ` Solve ${nTheme === 1 ? "it" : "them"} cleanly and ${outcome}.` : "";
  const why = out.join(" ");
  if (!(reviews || move || more > 0)) return why;
  // A short why (no recent miss) shares a paragraph with the plan; with a miss to explain, the plan gets its own.
  if (miss && did) return `${why}\n\nWe'll ${run}!${move}`;
  const closer = near && out.at(-1)?.endsWith(`${days(near)} away.`) ? `${why.slice(0, -1)}, so we'll` : `${why} We'll`;
  return `${closer} ${run}!${move}`;
}

export interface Card {
  kind: "resume" | "due" | "weak";
  label: string;
  title: string;
  body: string;
  problem: string | null;
}

/**
 * Up to three cards: an unfinished problem, the most overdue review, and the weakest technique.
 * `title` maps a problem id to its title.
 */
export function personalCards(queue: TodayEntry[], skills: Skill[] | null, title: (id: string) => string, now: Date, next: string | null = null): Card[] {
  const cards: Card[] = [];
  const history = (skills ?? []).flatMap((s) => s.history);
  const started = queue.find((e) => e.kind === "new" && e.state.attempts > 0 && e.state.clean_passes === 0 && e.problem !== next);
  if (started) {
    const last = [...history].reverse().find((h) => h.problem === started.problem);
    const got = last && attemptPhrase(last);
    cards.push({
      kind: "resume",
      label: "Jump back in",
      title: title(started.problem),
      body: got ? `Last time you ${got}, ${dayAgo(last.date, now)}` : `You've started it ${started.state.attempts === 1 ? "once" : `${started.state.attempts} times`} and haven't passed it yet`,
      problem: started.problem,
    });
  }
  // The hero card already shows `next`, so this card picks the next most overdue review.
  const due = queue.filter((e) => e.kind === "review" && e.overdue_days > 0 && e.problem !== next).sort((a, b) => b.overdue_days - a.overdue_days)[0];
  if (due) {
    const n = due.overdue_days;
    cards.push({
      kind: "due",
      label: n <= 2 ? "Due before it slips" : "Waiting the longest",
      title: title(due.problem),
      body: n <= 2 ? `It came due ${n === 1 ? "yesterday" : "2 days ago"}, so a clean pass today keeps it on schedule` : `It's been waiting ${n} days, and one clean pass puts it back on schedule`,
      problem: due.problem,
    });
  }
  // A flagged weak spot has its own panel beside Today, so this card only speaks when there is none.
  const tried = (skills ?? []).filter((s) => (s.evidence.attempts ?? 0) > 0);
  const weak = tried.filter((s) => s.level === "shaky" || s.level === "building").sort((a, b) => b.need - a.need)[0];
  if (weak && tried.length >= 2 && !tried.some((s) => s.weak_spot)) {
    const outcome = LEVEL_OUTCOME[weak.level]?.("it");
    cards.push({
      kind: "weak",
      label: "Still building",
      title: weak.technique_title,
      body: `It's still ${weak.level}${outcome ? `. A few clean solves and ${outcome}` : ""}.`,
      problem: null,
    });
  }
  return cards;
}

/** "A week ago you couldn't solve X. It's back in today's reviews, so try it clean." Null when nothing fits. */
export function onThisDay(queue: TodayEntry[], skills: Skill[] | null, now: Date): string | null {
  const due = new Set(queue.filter((e) => e.kind === "review").map((e) => e.problem));
  const back = new Set([addDays(localDay(now), -7), addDays(localDay(now), -14), addDays(localDay(now), -30)]);
  const h = (skills ?? []).flatMap((s) => s.history).find((a) => a.mark !== "clean" && back.has(a.date) && due.has(a.problem));
  if (!h) return null;
  const when = cap(dayAgo(h.date, now).replace("14 days ago", "two weeks ago").replace("30 days ago", "a month ago"));
  const what = h.mark === "missed" ? `you couldn't solve ${h.title}` : h.mark === "hint" ? `you needed a hint on ${h.title}` : `${h.title} took you past the time target`;
  return `${when} ${what}. It's back in today's reviews, so try it clean`;
}

export const CLEAN_MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

/** The newest clean-pass milestone above `seen`, or null. */
export function milestone(states: Record<string, State>, seen: number): number | null {
  const total = Object.values(states).reduce((n, s) => n + s.clean_passes, 0);
  const m = [...CLEAN_MILESTONES].reverse().find((x) => x <= total);
  return m !== undefined && m > seen ? m : null;
}

const ORD = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
export const milestoneLine = (n: number) => `That's your ${ORD(n)} clean pass`;

/** "Friday" for a `YYYY-MM-DD`. */
export const weekdayOf = (day: string): string => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });

/** "3 days in a row", or "12 days, with your rest day on Sunday", from 2 days on; silent otherwise, never a warning. */
export function momentum(streak: number, rests: string[] = []): string | null {
  if (streak < 2) return null;
  if (!rests.length) return `${streak} days in a row`;
  return rests.length === 1 ? `${streak} days, with your rest day on ${weekdayOf(rests[0] ?? "")}` : `${streak} days, with a rest day each week`;
}

/**
 * The wrap-up when nothing is left today. Offers a retake when the last diagnostic is over
 * 30 days old (`diagnosticMs` null means it was never taken).
 */
export function wrapUp(
  done: { clean: number; total: number; minutes: number },
  diagnosticMs: number | null,
  now: Date,
  tomorrow: { technique: string | null; reviews: number } | null = null,
): { text: string; retake: boolean } {
  const parts: string[] = [];
  if (done.total) {
    const clean = done.clean === done.total ? (done.total === 1 ? "cleanly" : "all cleanly") : done.clean ? `${num(done.clean)} of them cleanly` : "";
    parts.push(`You worked through ${num(done.total)} ${done.total === 1 ? "problem" : "problems"} today${clean ? `, ${clean}` : ""}${done.minutes >= 1 ? `${clean ? "," : ""} in about ${Math.round(done.minutes)} minutes` : ""}${done.clean === done.total ? "!" : "."}`);
    parts.push("Nothing else is due until tomorrow, so the rest of the day is yours.");
    const t = tomorrow;
    if (t?.technique) parts.push(`Tomorrow we'll pick up ${midSentence(t.technique)}${t.reviews ? `, after ${t.reviews === 1 ? "a quick review" : `${num(t.reviews)} quick reviews`}` : ""}.`);
    else if (t?.reviews) parts.push(`Tomorrow starts with ${t.reviews === 1 ? "one review" : `${num(t.reviews)} reviews`}.`);
  } else {
    parts.push("Nothing is due today, so your reviews are on schedule and the rest of the day is yours.");
  }
  const retake = diagnosticMs !== null && now.getTime() - diagnosticMs > 30 * 86_400_000;
  if (retake) parts.push("Your last diagnostic was over a month ago, so a retake would move your plan to where you are now.");
  return { text: parts.join(" ").replace(/\.$/, ""), retake };
}

/** "Why this one" for a review: the last attempt and where a clean pass puts it. */
export function reviewWhy(e: Pick<TodayEntry, "problem" | "overdue_days" | "state">, skills: Skill[] | null, now: Date): string {
  const r = e.state.rung;
  const next = RUNG_DAYS[Math.min(Math.max(r + 1, 0), RUNG_DAYS.length - 1)] ?? 30;
  const last = [...(skills ?? []).flatMap((s) => s.history)].reverse().find((h) => h.problem === e.problem);
  const did = last && (attemptPhrase(last) ?? (last.mark === "clean" ? "solved it cleanly" : null));
  const lead = last && did
    ? `${cap(dayAgo(last.date, now))} you ${did}, so ${last.mark === "clean" ? "another" : "a"} clean pass now`
    : `${e.overdue_days <= 0 ? "It's due today" : e.overdue_days === 1 ? "It came due yesterday" : `It came due ${e.overdue_days} days ago`}, and a clean pass`;
  return `${lead} puts the next review ${whenFrom(now, next)}`;
}

/** "tomorrow", "on Wednesday" within a week, "in 2 weeks", "in 30 days". */
export function whenFrom(now: Date, n: number): string {
  if (n === 1) return "tomorrow";
  if (n < 7) return `on ${weekdayOf(addDays(localDay(now), n))}`;
  return n % 7 === 0 ? `in ${n === 7 ? "a week" : `${n / 7} weeks`}` : `in ${n} days`;
}
