// Pure helpers behind the Plan page and the availability editor: clock text, the week
// grid's folded time scale, drag and keyboard move targets, painter cells <-> windows,
// and the setting changes (moves, days off, budgets) the plan re-runs from.
import type { Availability, PlanDay, PlanMove, PlanSession, Weekday } from "./types";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Weekday stepper values (minutes) and weekend ones. */
export const WEEKDAY_STEPS = [30, 45, 60, 75, 90, 105, 120];
export const WEEKEND_STEPS = [60, 90, 120, 150, 180];
export const SESSION_LENGTHS = [30, 45, 60, 90];
export const LEAD_TIMES = [10, 15, 30, 60];

/** `HH:MM` to minutes after midnight (`24:00` is 1440). */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toHHMM(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const ampm = (m: number) => ((m % 1440) < 720 ? "am" : "pm");
function bare(m: number): string {
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, "0")}` : `${h12}`;
}

/** "9 pm", "10:30 am". */
export const clock = (m: number): string => `${bare(m)} ${ampm(m)}`;

/** "9 to 10:40 pm", "10:30 am to 12:10 pm". */
export function span(a: number, b: number): string {
  return ampm(a) === ampm(b) ? `${bare(a)} to ${bare(b)} ${ampm(b)}` : `${clock(a)} to ${clock(b)}`;
}

/** "45 min", "1 h", "1 h 30" (the plan's compact form). */
export function fmtM(m: number): string {
  const r = Math.max(0, Math.round(m));
  if (r < 60) return `${r} min`;
  return r % 60 ? `${Math.floor(r / 60)} h ${r % 60}` : `${r / 60} h`;
}

/** Minutes after local midnight of a timestamp. */
export function minuteOf(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** `YYYY-MM-DD` of a local date. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const dateOf = (day: string): Date => new Date(`${day}T12:00:00`);
export const weekdayIndex = (day: string): number => (dateOf(day).getDay() + 6) % 7;
export const addDays = (day: string, n: number): string => {
  const d = dateOf(day);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

/** A visible stretch of the day, or a folded band. Minutes after midnight. */
export interface Band {
  from: number;
  to: number;
  fold: boolean;
}

/** Folds any gap of at least this long (minutes) with no session in it. */
export const FOLD_MIN = 60;
/** Minutes of air kept around a session before the grid folds the gap beside it. */
export const FOLD_PAD = 15;

/**
 * Hours the grid shows: each busy span (a session) padded by 15 minutes and rounded out to a
 * quarter hour, merged when less than an hour apart; any empty gap of an hour or more folds
 * into one band. `opened` are folded spans the learner expanded; they stay unfolded.
 */
export function bands(busy: [number, number][], opened: [number, number][] = []): Band[] {
  const spans = [
    ...busy.filter(([a, b]) => b > a).map(([a, b]): [number, number] => [Math.max(0, Math.floor((a - FOLD_PAD) / 15) * 15), Math.min(1440, Math.ceil((b + FOLD_PAD) / 15) * 15)]),
    ...opened,
  ].sort((x, y) => x[0] - y[0]);
  if (!spans.length) return [{ from: 18 * 60, to: 22 * 60, fold: false }];
  const out: Band[] = [];
  for (const [a, b] of spans) {
    const last = out.at(-1);
    if (!last) out.push({ from: a, to: b, fold: false });
    else if (a <= last.to) last.to = Math.max(last.to, b);
    else if (a - last.to >= FOLD_MIN) out.push({ from: last.to, to: a, fold: true }, { from: a, to: b, fold: false });
    else last.to = b;
  }
  return out;
}

/** y offset (px) of a minute on the folded scale. */
export function yOf(m: number, bs: Band[], hour: number, fold: number): number {
  let y = 0;
  for (const b of bs) {
    const len = b.fold ? fold : ((b.to - b.from) / 60) * hour;
    if (m <= b.from) return y;
    if (m < b.to) return y + (b.fold ? (fold * (m - b.from)) / (b.to - b.from) : ((m - b.from) / 60) * hour);
    y += len;
  }
  return y;
}

/** The minute at a y offset (inverse of `yOf`), for dragging. */
export function minuteAt(y: number, bs: Band[], hour: number, fold: number): number {
  let top = 0;
  for (const b of bs) {
    const len = b.fold ? fold : ((b.to - b.from) / 60) * hour;
    if (y < top + len) return b.from + ((y - top) / len) * (b.to - b.from);
    top += len;
  }
  return bs.at(-1)?.to ?? 0;
}

export const gridHeight = (bs: Band[], hour: number, fold: number): number => yOf(bs.at(-1)?.to ?? 0, bs, hour, fold);

export interface Win {
  start: number;
  end: number;
}

export const windowsOf = (day: PlanDay): Win[] => day.windows.map((w) => ({ start: toMin(w.start), end: toMin(w.end) }));

/**
 * Where a dragged block of `minutes` lands when the pointer is at `minute` in a day with
 * these windows: the nearest window, at the pointer snapped to 5 minutes and kept inside
 * it (a window shorter than the block starts the block at the window's start).
 */
export function dropTarget(wins: Win[], minute: number, minutes: number, notBefore = 0): { win: Win; start: number } | null {
  const open = wins
    .map((w) => ({ ...w, start: Math.max(w.start, notBefore) }))
    .filter((w) => w.end - w.start >= 5);
  if (!open.length) return null;
  const dist = (w: Win) => (minute < w.start ? w.start - minute : minute > w.end ? minute - w.end : 0);
  const win = open.reduce((best, w) => (dist(w) < dist(best) ? w : best));
  const snapped = Math.round(minute / 5) * 5;
  const start = Math.max(win.start, Math.min(snapped, win.end - minutes));
  return { win, start: Math.max(win.start, start) };
}

/** Why a slot can't take a moved session. */
export type DropBlock = "off" | "past" | "overlap";

/**
 * Where a moved block of `minutes` lands with its top at `minute`: snapped to `snap` minutes and
 * kept inside the day. Any free time works, so a slot outside the usual windows is a one-off
 * move (`outside`); only a day off, a time already past, or an overlap with `busy` blocks it.
 */
export function freeDrop(
  minute: number,
  minutes: number,
  day: { wins: Win[]; busy: Win[]; off: boolean; notBefore?: number },
  snap = 15,
): { start: number; outside: boolean; blocked: DropBlock | null } {
  const start = Math.max(0, Math.min(Math.round(minute / snap) * snap, 24 * 60 - minutes));
  const end = start + minutes;
  const outside = !day.wins.some((w) => w.start <= start && end <= w.end);
  const blocked: DropBlock | null = day.off
    ? "off"
    : start < (day.notBefore ?? 0)
      ? "past"
      : day.busy.some((b) => b.start < end && start < b.end)
        ? "overlap"
        : null;
  return { start, outside, blocked };
}

/** Keyboard move: the day index and window index the lifted block points at. */
export interface KeyMove {
  day: number;
  win: number;
}

/**
 * Arrow keys move a lifted block: Left/Right change day (skipping days with no window),
 * Up/Down step through that day's windows (wrapping).
 */
export function stepMove(k: KeyMove, key: string, wins: Win[][]): KeyMove {
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const dir = key === "ArrowRight" ? 1 : -1;
    for (let d = k.day + dir; d >= 0 && d < wins.length; d += dir) if (wins[d]?.length) return { day: d, win: 0 };
    return k;
  }
  if (key === "ArrowUp" || key === "ArrowDown") {
    const n = wins[k.day]?.length ?? 0;
    if (!n) return k;
    return { day: k.day, win: (k.win + (key === "ArrowDown" ? 1 : n - 1)) % n };
  }
  return k;
}

/** The move setting for dropping `s` (on `from`) at `start` on `to`. */
export function moveFor(s: PlanSession, from: string, to: string, start: number): PlanMove {
  return {
    from,
    from_start: toHHMM(minuteOf(s.start_ms)),
    to,
    to_start: toHHMM(start),
    minutes: Math.max(5, Math.round((s.end_ms - s.start_ms) / 60000)),
  };
}

/**
 * Adds a move, dropping moves for past days. A block that was itself moved here is
 * re-moved from its original slot, so moves never chain.
 */
export function addMove(moves: PlanMove[], m: PlanMove, today: string): PlanMove[] {
  const prior = moves.find((x) => x.to === m.from && x.to_start === m.from_start);
  const next = prior ? { ...m, from: prior.from, from_start: prior.from_start } : m;
  const kept = moves.filter((x) => x !== prior && x.to >= today && x.from >= addDays(today, -1));
  return next.from === next.to && next.from_start === next.to_start ? kept : [...kept, next];
}

/** Days-off toggle, sorted, past days dropped. */
export function toggleDayOff(off: string[], day: string, today: string): string[] {
  const kept = off.filter((d) => d >= today);
  return (kept.includes(day) ? kept.filter((d) => d !== day) : [...kept, day]).sort();
}

/** The next stepper value in `dir` from `v` (snapping a value that isn't a step). */
export function step(steps: number[], v: number, dir: 1 | -1): number {
  if (dir > 0) return steps.find((s) => s > v) ?? steps.at(-1) ?? v;
  return [...steps].reverse().find((s) => s < v) ?? steps[0] ?? v;
}

// Availability painter: half-hour cells from 07:00 to 24:00.

export const PAINT_FROM = 7 * 60;
// shortcut: rows stop at midnight because planner windows never cross it; extend when they can.
export const PAINT_ROWS = 34;

/** Cell key `d:slot`, slot = half hours after `PAINT_FROM`. */
export const cellKey = (day: number, slot: number) => `${day}:${slot}`;

export function cellsFromWindows(ws: Availability[]): Set<string> {
  const on = new Set<string>();
  for (const w of ws) {
    const [a, b] = [toMin(w.start), toMin(w.end)];
    for (const d of w.days) {
      const di = WEEKDAYS.indexOf(d);
      for (let r = 0; r < PAINT_ROWS; r++) {
        const m = PAINT_FROM + r * 30;
        if (m >= a && m + 30 <= b) on.add(cellKey(di, r));
      }
    }
  }
  return on;
}

/** Runs per day, then days with the same run merged into one window. */
export function windowsFromCells(on: Set<string>): Availability[] {
  const byRun = new Map<string, Weekday[]>();
  for (let d = 0; d < 7; d++) {
    let start: number | null = null;
    for (let r = 0; r <= PAINT_ROWS; r++) {
      const lit = r < PAINT_ROWS && on.has(cellKey(d, r));
      if (lit && start === null) start = r;
      if (!lit && start !== null) {
        const key = `${toHHMM(PAINT_FROM + start * 30)}-${toHHMM(Math.min(1440, PAINT_FROM + r * 30))}`;
        byRun.set(key, [...(byRun.get(key) ?? []), WEEKDAYS[d] as Weekday]);
        start = null;
      }
    }
  }
  return [...byRun.entries()]
    .map(([k, days]) => {
      const [start = "", end = ""] = k.split("-");
      return { days, start, end };
    })
    .sort((a, b) => WEEKDAYS.indexOf(a.days[0] as Weekday) - WEEKDAYS.indexOf(b.days[0] as Weekday) || a.start.localeCompare(b.start));
}

/** Per weekday, its windows as text: "9 to 10:30 pm, Sat 10 am to 12 pm". */
export function windowsByDay(ws: Availability[]): string[] {
  return WEEKDAYS.map((d) =>
    ws
      .filter((w) => w.days.includes(d))
      .map((w) => [toMin(w.start), toMin(w.end)] as const)
      .sort((a, b) => a[0] - b[0])
      .map(([a, b]) => span(a, b))
      .join(", "),
  );
}

export const weeklyMinutes = (ws: Availability[]): number => ws.reduce((n, w) => n + (toMin(w.end) - toMin(w.start)) * w.days.length, 0);

/** "Weeknights 9 to 10:30 pm, Sat 10 am to 12 pm": a one-line summary for Settings. */
export function windowsSummary(ws: Availability[]): string {
  if (!ws.length) return "None yet. The plan uses the hour you usually practice";
  const daysText = (days: Weekday[]) => {
    const key = days.join(",");
    if (key === "mon,tue,wed,thu,fri") return "Weeknights";
    if (key === "sat,sun") return "Weekends";
    if (days.length === 7) return "Every day";
    return days.map((d) => DAY_SHORT[WEEKDAYS.indexOf(d)]).join(" and ");
  };
  return ws.map((w) => `${daysText(w.days)} ${span(toMin(w.start), toMin(w.end))}`).join(", ");
}

/** Quick patterns in the editor. */
export const PRESETS: { id: string; label: string; windows: Availability[] }[] = [
  { id: "wn", label: "Weeknights 7 to 8:30 pm", windows: [{ days: ["mon", "tue", "wed", "thu", "fri"], start: "19:00", end: "20:30" }] },
  { id: "late", label: "Weeknights 9 to 10:30 pm", windows: [{ days: ["mon", "tue", "wed", "thu", "fri"], start: "21:00", end: "22:30" }] },
  { id: "wkm", label: "Weekend mornings", windows: [{ days: ["sat", "sun"], start: "10:00", end: "12:00" }] },
  { id: "lunch", label: "Lunch breaks", windows: [{ days: ["mon", "tue", "wed", "thu", "fri"], start: "12:00", end: "13:00" }] },
];

/** A preset is pressed when every one of its cells is painted. */
export function presetOn(on: Set<string>, ws: Availability[]): boolean {
  const cells = cellsFromWindows(ws);
  return cells.size > 0 && [...cells].every((k) => on.has(k));
}

/** The first-run default: weeknights 7 to 8:30 and weekend mornings. */
export const DEFAULT_WINDOWS: Availability[] = [...(PRESETS[0]?.windows ?? []), ...(PRESETS[2]?.windows ?? [])];

/** Finished attempts grouped into sittings (gaps under 45 min), for today's done blocks. */
export function sittings<T extends { start: number; end: number | null }>(atts: T[], gapMs = 45 * 60_000): { start: number; end: number; items: T[] }[] {
  const out: { start: number; end: number; items: T[] }[] = [];
  for (const a of atts.filter((x) => x.end !== null).sort((x, y) => x.start - y.start)) {
    const end = a.end as number;
    const last = out.at(-1);
    if (last && a.start - last.end <= gapMs) {
      last.end = Math.max(last.end, end);
      last.items.push(a);
    } else out.push({ start: a.start, end, items: [a] });
  }
  return out;
}

/** Same rule as the core's `mid_sentence`: "Merge And Split" reads "merge and split", acronyms stay. */
export function midSentence(title: string): string {
  const word = (w: string) => (w.length > 1 && /^[A-Z][^A-Z]*$/.test(w) && w !== "Kadane" ? w.toLowerCase() : w);
  return title
    .split(" ")
    .map((w) => w.split("-").map(word).join("-"))
    .join(" ");
}
