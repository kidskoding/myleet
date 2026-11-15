// The Plan page's sentences, built only from the learner's own data. Kept pure so the
// wording can be tested without a page.
import { addDays } from "./streak";
import { goalLine, names } from "./goals";
import { daysUntil, paceRows, shortDate } from "./plan";
import { attempts, parseEvents } from "./attempts";
import { missedMinutes, recordPlanned, standing, type Standing } from "./plan-progress";
import { fmtM, isoDay, midSentence } from "./schedule";
import type { Prefs } from "./prefs";
import type { Availability, Forecast, Habits, Plan } from "./types";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Small counts as words, larger ones as digits. */
export const count = (n: number): string => WORDS[n] ?? String(n);
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

type Part = "morning" | "afternoon" | "evening" | "night";
const partOf = (hour: number): Part => (hour < 5 || hour >= 22 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening");
const clock = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "am" : "pm"}`;

/** "most evenings around 8 pm", "weekend mornings around 9 am", from the half-hour cells you practised in. */
export function habitPhrase(cells: [number, number][]): string | null {
  if (cells.length < 3) return null;
  const hours = new Map<number, number>();
  for (const [, slot] of cells) hours.set(Math.floor(slot / 2), (hours.get(Math.floor(slot / 2)) ?? 0) + 1);
  const hour = [...hours.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 19;
  const days = new Set(cells.map(([d]) => d));
  const part = partOf(hour);
  const which = [...days].every((d) => d >= 5) ? `weekend ${part}s` : [...days].every((d) => d < 5) ? `weekday ${part}s` : days.size >= 5 ? `most ${part}s` : `${part}s`;
  return `${which} around ${clock(hour)}`;
}

export function drawerLede(history: Habits["history"] | null): string {
  const habit = history ? habitPhrase(history.cells) : null;
  return habit
    ? `You've been solving ${habit}, so we started there. Change anything and your plan reshapes as you go.`
    : "Mark the hours that usually work for you. Change anything later and your plan reshapes as you go.";
}

/** "evenings" from the start times of the windows on the given days; "" when they're mixed or there are none. */
function partPhrase(ws: Availability[], days: string[]): string {
  const parts = new Map<Part, number>();
  for (const w of ws) {
    const n = w.days.filter((d) => days.includes(d)).length;
    if (n) parts.set(partOf(Number(w.start.slice(0, 2))), (parts.get(partOf(Number(w.start.slice(0, 2)))) ?? 0) + n);
  }
  const top = [...parts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top.length || (top[1] && top[1][1] * 2 >= (top[0]?.[1] ?? 0))) return "";
  return `${top[0]?.[0]}s`;
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];

/** "an hour", "90 minutes", "2 hours". */
const lengthPhrase = (m: number) => (m === 60 ? "an hour" : m === 90 ? "an hour and a half" : m > 60 && m % 60 === 0 ? `${m / 60} hours` : `${Math.round(m / 5) * 5} minutes`);

/** "about an hour on weekday evenings and a bit more on weekends". */
export function rhythmPhrase(o: { weekday: number; weekend: number; windows: Availability[] }): string {
  const part = partPhrase(o.windows, WEEKDAYS);
  const first = `about ${lengthPhrase(o.weekday)} on ${part ? `weekday ${part}` : "weekdays"}`;
  const second = o.weekend === o.weekday ? "the same on weekends" : o.weekend > o.weekday ? "a bit more on weekends" : "a bit less on weekends";
  return `${first} and ${second}`;
}

export interface HeadCopy {
  title: string;
  lede: string;
}

/**
 * The Plan page's title and lede. `company` is the next interview's company or the first target;
 * `companies` every target company and `topics` the focus topics (mid-sentence), for the mix.
 */
export function headCopy(o: { plan: Plan; company: string | null; companies?: string[]; topics?: string[]; name: string | null; windows: Availability[]; weekday?: number | undefined; weekend?: number | undefined; today: string; nextAfter?: { company: string | null; date: string } | null }): HeadCopy {
  const h = headText(o);
  return { title: h.title, lede: h.lede.replace(/\.$/, "") };
}

function headText(o: Parameters<typeof headCopy>[0]): HeadCopy {
  const { plan, company, name } = o;
  const cos = o.companies?.length ? o.companies : company ? [company] : [];
  const topics = o.topics ?? [];
  const date = plan.interview_date;
  const you = name ? `, ${name}` : "";
  const mocks = plan.summary.mocks;
  const mockPart = !date || mocks === 0 ? "" : mocks === 1 ? ", with a mock interview a few days before" : mocks >= 3 ? ", with mock interviews getting closer together toward the end" : `, with ${count(mocks)} mock interviews along the way`;
  const weekday = o.weekday ?? Math.round(plan.days.filter((d) => !d.off).reduce((m, d) => m + d.minutes, 0) / Math.max(1, plan.days.filter((d) => !d.off).length));
  const planned = `You'll practice ${rhythmPhrase({ weekday, weekend: o.weekend ?? weekday, windows: o.windows })}${mockPart}, and the plan adjusts after every solve.`;
  const after = o.nextAfter ? ` ${o.nextAfter.company ?? "Your next interview"} on ${shortDate(o.nextAfter.date)} comes after that.` : "";
  if (!date) {
    const goal = cos.length > 1 || topics.length ? ` ${goalLine(cos, topics)}.` : company ? ` Your plan works toward ${company} through its practice set and the patterns you need to build.` : " Keep building a steady practice routine, with reviews that help what you learn stick.";
    return { title: cos.length ? `Your road to ${names(cos)}${you}` : `Your next four weeks${you}`, lede: `${planned}${goal}` };
  }
  const left = daysUntil(date, o.today);
  const when = `${plural(left, "day")} until your ${company ? `${company} ` : ""}interview on ${shortDate(date)}.`;
  return { title: company ? `Your road to ${company}${you}` : `Your road to ${shortDate(date)}${you}`, lede: `${when[0]?.toUpperCase()}${when.slice(1)} ${planned}${after}${topics.length ? ` Extra time goes to ${names(topics)}.` : ""}` };
}

/** "Day 4 of 30 · 26 days to Dec 15", and the share done, for the progress line. */
export function progressLine(startedAt: string, date: string, today: string): { text: string; share: number } {
  const total = Math.max(1, daysUntil(date, startedAt));
  const day = Math.min(total, Math.max(1, daysUntil(today, startedAt) + 1));
  const left = Math.max(0, daysUntil(date, today));
  return { text: `Day ${day} of ${total} · ${left === 1 ? "1 day" : `${left} days`} to ${shortDate(date)}`, share: day / total };
}

/** The grouped forecast sentence. */
export function forecastLead(o: { forecast: Forecast[]; date: string | null; companies: string[]; weekday: number; closeAll: number | null }): string {
  const all = o.forecast;
  if (!all.length) return "";
  const ready = all.filter((f) => f.behind_by === 0).length;
  const n = all.length;
  const one = o.companies.length === 1 ? o.companies[0] : null;
  const many = o.companies.length > 1;
  const by = o.date ? `by ${shortDate(o.date)}` : "in four weeks";
  if (ready === n) return `At this pace you'll be ready for all ${one ? `${n} of ${one}'s core topics` : many ? `${n} core topics your companies lean on` : `${n} core topics`} ${by}`;
  const of = one ? `${one}'s ${n} core topics` : many ? `the ${n} core topics your companies lean on` : `${n} core topics`;
  const extra = o.closeAll && o.closeAll > o.weekday ? ` Adding ${fmtM(o.closeAll - o.weekday)} on weekdays gets you to all of them` : "";
  if (!ready) return `None of ${of.replace(/^the /, "the ")} ${n === 1 ? "is" : "are"} on pace ${by} yet${extra ? `.${extra}` : ""}`;
  return `At this pace you'll be ready for ${ready} of ${of} ${by}${extra ? `.${extra}` : ""}`;
}

/** "You solve mediums in about 22 minutes, a bit faster than the 25-minute target." */
export function paceLine(pace: Plan["pace"], targets: Record<"easy" | "medium" | "hard", number>): string {
  const sample = pace.sample ?? 0;
  if (sample < 5) return `After ${sample ? "a few more" : "a few"} solves we'll size sessions to your own speed. Until then they use the ${targets.medium}-minute target for mediums.`;
  const level = (["medium", "easy", "hard"] as const).find((d) => pace.median_secs[d]);
  if (!level) return "Sessions are sized from your own times and update after every solve";
  const mins = Math.round((pace.median_secs[level] ?? 0) / 60);
  const target = targets[level];
  const gap = mins - target;
  const vs = Math.abs(gap) <= 1 ? `right on the ${target}-minute target` : gap < -5 ? `well under the ${target}-minute target` : gap < 0 ? `a bit faster than the ${target}-minute target` : gap <= 5 ? `a little over the ${target}-minute target` : `over the ${target}-minute target, so sessions leave room for that`;
  return `You solve ${level}s in about ${mins} minutes, ${vs}`;
}

export const INSIGHTS_EMPTY =
  "Patterns in your own solving show up here after a week or two of practice, each with the attempts behind it. Every solve you log this week counts toward the first one.";

/** "You've kept 3 of your last 4 sessions, and you're on pace for Dec 15." */
export function onTrackLine(s: Standing, date: string | null, company: string | null = null): string {
  if (!s.of) return "";
  const goal = date ? `${company ? `${company} on ` : ""}${shortDate(date)}` : "";
  const pace = s.onPace ? (date ? `you're right on pace for ${goal}` : "you're on pace for the next four weeks") : date ? `a few topics are running behind for ${goal}` : "a few topics are running behind";
  if (!s.kept) return `Your last ${s.of === 1 ? "session" : `${count(s.of)} sessions`} slipped by, so the work moved forward. Right now ${pace}`;
  const kept = s.kept === s.of ? `You've kept ${s.of === 1 ? "your first session" : `all ${count(s.of)} of your last sessions`}` : `You've kept ${count(s.kept)} of your last ${count(s.of)} sessions`;
  return `${kept}, and ${pace}`;
}

/** "68 minutes", "about 3 hours": minutes inside a sentence. */
export const proseMinutes = (m: number): string => (Math.round(m) < 120 ? `${Math.round(m)} ${Math.round(m) === 1 ? "minute" : "minutes"}` : `about ${Math.round(m / 60)} hours`);

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayWord = (d: string) => WEEKDAY[new Date(`${d}T12:00:00`).getDay()] ?? d;

export interface CatchUp {
  key: string;
  title: string;
  body: string;
  minutes: number;
}

/** A calm note after a slip. Missed work has already rolled forward; this only offers ways to catch up sooner. */
export function catchUp(s: Standing): CatchUp | null {
  const days = s.slipped;
  const last = days.at(-1);
  if (!last) return null;
  const minutes = missedMinutes(s);
  const title = days.length === 1 ? `${dayWord(last.date)}'s session didn't happen` : `${count(days.length)} sessions slipped this week`.replace(/^./, (c) => c.toUpperCase());
  return {
    key: last.date,
    title,
    body: `${days.length === 1 ? "Its" : "Their"} reviews moved into your next free windows, so nothing is lost. To catch up a little sooner, spread those ${proseMinutes(minutes)} over the next few days or add some time on weekdays.`,
    minutes,
  };
}

/** The weekly check-in day: Sunday, or the first day of the week you have a window on. */
export function checkinDay(ws: Availability[]): number {
  const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const days = new Set(ws.flatMap((w) => w.days as string[]));
  const first = order.findIndex((d) => days.has(d));
  return first < 0 ? 0 : first;
}

export interface Checkin {
  key: string;
  title: string;
  body: string;
}

export interface WeekRecap {
  solved: number;
  clean: number;
  /** A clean pass this week on a problem missed or hinted earlier. */
  best: { title: string; days: number } | null;
}

/** The last seven days before `today`: problems passed, how many cleanly, and the best comeback. */
export function weekRecap(events: string, today: string, titleOf: (problem: string) => string | null): WeekRecap {
  const from = addDays(today, -7);
  const all = attempts(parseEvents(events)).filter((a) => a.mode === "practice" && a.end !== null);
  const inWeek = (a: (typeof all)[number]) => { const d = isoDay(new Date(a.end ?? 0)); return d >= from && d < today; };
  const passes = all.filter((a) => a.passed && inWeek(a));
  const clean = passes.filter((a) => !a.hints && !a.peeks);
  let best: WeekRecap["best"] = null;
  for (const a of clean) {
    const miss = all.filter((b) => b.problem === a.problem && (b.end ?? 0) < a.start && (!b.passed || b.hints || b.peeks)).at(-1);
    const title = miss ? titleOf(a.problem) : null;
    if (miss && title) best = { title, days: Math.max(1, Math.round((a.start - (miss.end ?? a.start)) / 86_400_000)) };
  }
  return { solved: passes.length, clean: clean.length, best };
}

/** Next week's focus: the started topic furthest behind, the same one Today's interview card leads with. */
export const weekFocus = (plan: Plan): string | null => paceRows(plan.forecast).find((f) => f.status === "behind")?.title ?? null;

/** The Sunday recap: sessions kept, problems solved, the best comeback, what moved, and next week's focus. */
export function weeklyCheckin(o: { standing: Standing; today: string; windows: Availability[]; topics: string[]; date: string | null; recap?: WeekRecap | undefined; focus?: string | null }): Checkin | null {
  if (new Date(`${o.today}T12:00:00`).getDay() !== checkinDay(o.windows)) return null;
  const weekAgo = addDays(o.today, -7);
  const week = o.standing.days.filter((d) => d.date >= weekAgo);
  if (!week.length) return null;
  const planned = week.reduce((n, d) => n + d.sessions, 0);
  const kept = week.reduce((n, d) => n + d.kept, 0);
  const topics = o.topics.slice(0, 3).map(midSentence);
  const list = topics.length > 1 ? `${topics.slice(0, -1).join(", ")} and ${topics.at(-1)}` : (topics[0] ?? "");
  const r = o.recap;
  const solved = r?.solved ? ` and solved ${plural(r.solved, "problem")}${r.clean === r.solved ? `, all of them clean` : r.clean ? `, ${count(r.clean)} of them clean` : ""}` : "";
  const lead = kept
    ? `This week you kept ${count(kept)} of ${count(planned)} ${planned === 1 ? "session" : "sessions"}${solved}.`
    : `This week's ${planned === 1 ? "session" : `${count(planned)} sessions`} slipped by, and their work moved forward${solved ? `. You still${solved.replace(" and", "")}` : ""}.`;
  const best = r?.best ? ` Your best moment: ${r.best.title}, clean ${r.best.days === 1 ? "a day" : `${count(r.best.days)} days`} after it got the better of you!` : "";
  const moved = list ? ` You moved forward on ${list}.` : "";
  const pace = o.standing.onPace ? ` You're on pace${o.date ? ` for ${shortDate(o.date)}` : ""}.` : ` A few topics are behind${o.date ? ` for ${shortDate(o.date)}` : ""}.`;
  const focus = o.focus ? ` Next week leans on ${midSentence(o.focus)}, the topic furthest behind.` : "";
  return {
    key: o.today,
    title: "Your weekly check-in",
    body: `${lead}${best}${moved}${pace}${focus} Keep this pace, add a little time, or ${o.date ? "shift the date if your interview moved" : "adjust your practice schedule"}`,
  };
}

/** What a goal change would do, for the Change plan preview. */
export function changePreview(o: { before: Plan; after: Plan; company: string | null; dateMoves: number }): string {
  const days = (p: Plan) => Math.max(1, p.days.filter((d) => !d.off).length);
  const avg = (p: Plan) => p.days.reduce((m, d) => m + d.minutes, 0) / days(p);
  const diff = Math.round((avg(o.after) - avg(o.before)) / 5) * 5;
  const from = o.before.interview_date;
  const to = o.after.interview_date;
  const parts: string[] = [];
  const lead = to && to !== from ? `Moving to ${shortDate(to)}` : !to && from ? "Planning without a date" : "This change";
  if (diff) parts.push(`${diff < 0 ? "lightens" : "adds"} about ${fmtM(Math.abs(diff))} ${diff < 0 ? "from each day" : "to each day"}`);
  const mocks = o.after.summary.mocks - o.before.summary.mocks;
  if (mocks) parts.push(`means ${plural(Math.abs(mocks), "mock")} ${mocks > 0 ? "more" : "fewer"}${o.company ? ` before ${o.company}` : ""}`);
  const behind = o.after.forecast.filter((f) => f.behind_by > 0).length - o.before.forecast.filter((f) => f.behind_by > 0).length;
  if (behind) parts.push(`leaves ${plural(Math.abs(behind), "topic")} ${behind > 0 ? "more" : "fewer"} behind`);
  const body = parts.length ? `${lead} ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]}.` : `${lead} keeps the plan about the same.`;
  const moved = o.dateMoves ? ` You've moved your date ${o.dateMoves === 1 ? "once" : o.dateMoves === 2 ? "twice" : `${count(o.dateMoves)} times`} already.` : "";
  return body + (to !== from ? moved : "");
}

/** The catch-up's one click: the missed minutes added across the next three planned days. Null with no day to use. */
export function spreadDays(plan: Plan, p: Pick<Prefs["plan"], "dayMinutes" | "weekendMinutes" | "dailyMinutes">, minutes: number): { dayMinutes: Prefs["plan"]["dayMinutes"]; each: number; count: number } | null {
  const days = plan.days.filter((d) => !d.off && d.windows.length).slice(0, 3);
  if (!days.length) return null;
  const each = Math.min(60, Math.ceil(minutes / days.length / 5) * 5);
  const budget = (d: Plan["days"][number]) => p.dayMinutes.find((x) => x.date === d.date)?.minutes ?? (d.weekday === "sat" || d.weekday === "sun" ? (p.weekendMinutes ?? p.dailyMinutes ?? 60) : (p.dailyMinutes ?? 60));
  const keep = p.dayMinutes.filter((x) => x.date >= plan.start && !days.some((d) => d.date === x.date));
  return { dayMinutes: [...keep, ...days.map((d) => ({ date: d.date, minutes: budget(d) + each }))], each, count: days.length };
}

/** For Today: the on-track sentence and the check-in, if it's due. Records today's planned load as a side effect. */
export function planStatus(
  plan: Plan,
  events: string,
  o: { windows: Availability[]; topicOf?: (problem: string) => string | null; titleOf?: (problem: string) => string | null; now?: Date; company?: string | null } = { windows: [] },
): { line: string; standing: Standing; checkin: Checkin | null; catchUp: CatchUp | null } {
  const now = o.now ?? new Date();
  recordPlanned(plan);
  const s = standing(plan, events, now);
  const today = plan.start;
  const topics = topicsMoved(events, today, o.topicOf);
  return {
    line: onTrackLine(s, plan.interview_date, o.company ?? null),
    standing: s,
    checkin: weeklyCheckin({ standing: s, today, windows: o.windows, topics, date: plan.interview_date, recap: o.titleOf ? weekRecap(events, today, o.titleOf) : undefined, focus: weekFocus(plan) }),
    catchUp: catchUp(s),
  };
}

/** Techniques with a pass in the seven days before `today`, most passes first. */
export function topicsMoved(events: string, today: string, topicOf?: (problem: string) => string | null): string[] {
  if (!topicOf) return [];
  const from = addDays(today, -7);
  const n = new Map<string, number>();
  for (const a of attempts(parseEvents(events))) {
    const day = a.end ? isoDay(new Date(a.end)) : "";
    const t = a.passed && day >= from && day < today ? topicOf(a.problem) : null;
    if (t) n.set(t, (n.get(t) ?? 0) + 1);
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
