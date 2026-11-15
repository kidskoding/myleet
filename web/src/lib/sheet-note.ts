import { masteryAfter } from "./coach";
// The personal copy on the workspace result sheet: the note about the attempt just finished,
// why the next problem is next, and what changed in the plan. Pure, so it is tested.
import { dayAgo } from "./coach";
import { midSentence } from "./schedule";
import type { Plan, SkillLevel } from "./types";

export type ResultKind = "clean" | "hint" | "over" | "miss";

export interface ResultFacts {
  kind: ResultKind;
  /** The technique's title ("Sliding Window"), null when the problem has none. */
  technique: string | null;
  passed: number;
  total: number;
  /** Failing test names, first first. */
  failing: string[];
  /** Clean solves of this technique in the last 7 days, this one included. */
  cleanThisWeek: number;
  /** Days until the next review of this problem. */
  reviewDays: number;
  levelAfter: SkillLevel | null;
  /** Attempts on the technique so far; the level only gets a line from 3 up, before that it's a first read. */
  attempts: number;
  /** An earlier edge-case miss from another problem: its title and day. */
  priorEdge: { title: string; date: string } | null;
  /** The company whose set leans on this technique, only when the plan says so. */
  company: string | null;
  daysLeft: number | null;
  targetMins: number;
  now: Date;
}

const ORDINAL = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const ord = (n: number) => ORDINAL[n] ?? `${n}th`;
const daysText = (n: number) => (n === 1 ? "1 day" : `${n} days`);
const EDGE = /empty|single|zero|null|none|negative|duplicate|edge|boundary|corner|min|max/;

const LEVEL_CLAUSE: Partial<Record<SkillLevel, string>> = {
  shaky: "is still shaky, and this is how it firms up",
  building: "is starting to feel solid",
  solid: "feels solid now",
  strong: "is one of your strongest topics",
};

/** `test_empty_array[3]` becomes "the empty array case"; generic names like `test_case_2` give null. */
export function caseName(test: string): string | null {
  const s = test.replace(/\[.*$/, "").replace(/^test_?/i, "").replace(/_/g, " ").trim().toLowerCase();
  if (!s || /^(case|example|sample|input|test)?\s*\d*$/.test(s)) return null;
  return `the ${s}${/\bcases?$/.test(s) ? "" : " case"}`;
}

/** Sentences joined with spaces; a lone sentence loses its period, per the UI copy rule. */
function join(parts: string[]): string {
  const out = parts.filter(Boolean);
  // UI text never ends on a period; a closing "!" stays.
  return out.join(" ").replace(/\.$/, "");
}

/** 1 to 3 flowing sentences about the attempt; null when there's nothing to say. */
export function resultNote(f: ResultFacts): string | null {
  const tech = f.technique ? midSentence(f.technique) : null;
  const review = daysText(f.reviewDays);
  const tie = f.company && tech ? `${f.company}'s set leans on ${tech}${f.daysLeft && f.daysLeft > 0 && f.daysLeft <= 30 ? ` and your interview is ${daysText(f.daysLeft)} away` : ""}.` : "";
  if (f.kind === "clean") {
    const n = Math.max(1, f.cleanThisWeek);
    const lead = tech ? `That's your ${ord(n)} clean ${tech} solve this week, which ${masteryAfter(f.reviewDays)}.` : `That was a clean pass, which ${masteryAfter(f.reviewDays)}.`;
    const level = tech && f.attempts >= 3 && f.levelAfter && LEVEL_CLAUSE[f.levelAfter] ? `${tech.charAt(0).toUpperCase()}${tech.slice(1)} ${LEVEL_CLAUSE[f.levelAfter]}.` : "";
    return join([lead, level, tie]);
  }
  if (f.kind === "hint") {
    return join([
      `You used a hint on this one, so the review stays at ${review} instead of climbing.`,
      "A clean pass on a later day gets it moving again.",
      tie,
    ]);
  }
  if (f.kind === "over") {
    return join([`Right answer, but past the ${f.targetMins}-minute target, so it counts like a hint and comes back in ${review}.`, "Same problem under the clock is the fastest fix."]);
  }
  if (!f.total) return null;
  const left = f.total - f.passed;
  const near = f.passed / f.total >= 0.7;
  const name = f.failing[0] ? caseName(f.failing[0]) : null;
  const missing = name ? (left > 1 ? ` and missed ${name} plus ${left - 1} more` : ` and only missed ${name}`) : "";
  const edge = name && EDGE.test(name) && f.priorEdge ? ` That's the same kind of edge case that tripped you up on ${f.priorEdge.title} ${dayAgo(f.priorEdge.date, f.now)}.` : "";
  const when = f.reviewDays === 1 ? "tomorrow" : `in ${review}`;
  // One "!" per note: the cheer on a near miss, the encouragement otherwise.
  const back = near ? `Let's revisit it ${when} so this one sticks.` : `Let's come back to it ${when} and work through it again!`;
  return join([`${near ? "Super close! " : ""}You passed ${f.passed} of ${f.total} test cases${missing}.${edge}`, back]);
}

export interface NextFacts {
  title: string;
  kind: "review" | "new" | "practice";
  technique: string | null;
  difficulty: string;
  overdueDays: number;
  started: boolean;
  weak: boolean;
  /** The problem just solved. */
  currentTechnique: string | null;
  currentDifficulty: string;
}

const RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** One line, no trailing period: why this problem is the next one. */
export function nextReason(n: NextFacts): string {
  const tech = n.technique ? midSentence(n.technique) : null;
  if (n.kind === "review") {
    const due = n.overdueDays <= 0 ? "due today" : n.overdueDays === 1 ? "due since yesterday" : `${n.overdueDays} days overdue`;
    return `A review that's ${due}, so a clean pass keeps it on schedule`;
  }
  if (tech && n.technique === n.currentTechnique) {
    const up = (RANK[n.difficulty] ?? 0) - (RANK[n.currentDifficulty] ?? 0);
    return up > 0 ? `More ${tech}, one step harder` : up < 0 ? `More ${tech}, a step easier to lock it in` : `More ${tech} while it's fresh`;
  }
  if (tech && n.weak) return `${tech.charAt(0).toUpperCase()}${tech.slice(1)} is your weakest spot right now`;
  if (tech && n.started) return `You started it before, and it's ${tech}`;
  return tech ? `A fresh topic for today: ${tech}` : "Next in today's queue";
}

type Days = Plan["days"];
const count = (days: Days, pick: (kind: string, technique: string | null) => boolean) =>
  days.flatMap((d) => d.sessions).flatMap((s) => s.items).filter((i) => pick(i.kind, i.technique)).length;

/** What this attempt changed in the plan, from the plan before and after; null when nothing moved. */
export function planChange(before: Plan | null, after: Plan | null, technique: string | null): string | null {
  if (!before || !after) return null;
  const tomorrow = (p: Plan) => p.days.slice(1, 2);
  if (technique) {
    const was = count(tomorrow(before), (_, t) => t === technique);
    const now = count(tomorrow(after), (_, t) => t === technique);
    if (now > was) return `We moved ${midSentence(technique)} up in tomorrow's session`;
  }
  const was = count(before.days.slice(1, 8), (k) => k === "review");
  const now = count(after.days.slice(1, 8), (k) => k === "review");
  if (now < was) return was - now === 1 ? "One less review needed this week" : `${was - now} fewer reviews needed this week`;
  if (now > was) return now - was === 1 ? "One more review is on this week's plan" : `${now - was} more reviews are on this week's plan`;
  return null;
}
