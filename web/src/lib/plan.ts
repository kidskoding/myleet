// Plan helpers around the wasm planner (`trainer.plan`): onboarding's time choices and the
// week view, and the Today pacing rows. The planner itself lives in myleet-core.
import { localDay } from "./streak";
import type { Forecast, Plan, SkillCause } from "./types";

export interface TimeOption {
  minutes: number;
  label: string;
  newPerDay: number;
  detail: string;
}

/** Onboarding's "time on most days"; minutes go to the account's `daily_minutes`. */
export const TIME_OPTIONS: TimeOption[] = [
  { minutes: 30, label: "30 minutes", newPerDay: 1, detail: "About 1 problem: mostly reviews, a new one most days" },
  { minutes: 60, label: "1 hour", newPerDay: 2, detail: "About 3 problems: reviews plus 1 or 2 new" },
  { minutes: 90, label: "90 minutes", newPerDay: 3, detail: "About 4 problems: reviews plus 2 or 3 new" },
  { minutes: 120, label: "2 hours or more", newPerDay: 4, detail: "About 5 problems, plus a weekly mock interview" },
];

export const timeOption = (minutes: number | null): TimeOption =>
  TIME_OPTIONS.find((o) => o.minutes === minutes) ?? (TIME_OPTIONS[1] as TimeOption);

export interface PlanWeek {
  label: string;
  from: string;
  to: string;
  /** Techniques started for the first time this week, in order. */
  techniques: string[];
  problems: number;
  mocks: number;
  /** No new problems this week: reviews (and mocks) only. */
  reviewsOnly: boolean;
}

/** The plan's days grouped into weeks from its start, for the onboarding plan step. */
export function planWeeks(plan: Plan): PlanWeek[] {
  const seen = new Set<string>();
  const weeks: PlanWeek[] = [];
  for (let i = 0; i < plan.days.length; i += 7) {
    const days = plan.days.slice(i, i + 7);
    const items = days.flatMap((d) => d.sessions.flatMap((s) => s.items));
    const techniques: string[] = [];
    for (const it of items)
      if (it.kind === "new" && !seen.has(it.technique)) {
        seen.add(it.technique);
        techniques.push(it.technique);
      }
    const problems = items.filter((it) => it.kind === "review" || it.kind === "new" || it.kind === "drill").length;
    weeks.push({
      label: `Week ${weeks.length + 1}`,
      from: days[0]?.date ?? plan.start,
      to: days.at(-1)?.date ?? plan.end,
      techniques,
      problems,
      mocks: items.filter((it) => it.kind === "mock").length,
      reviewsOnly: !items.some((it) => it.kind === "new"),
    });
  }
  return weeks;
}

/** Up to three pacing rows for Today: behind first (most behind), then started on-track ones. */
export function paceRows(forecast: Forecast[]): Forecast[] {
  const behind = forecast.filter((f) => f.status === "behind" && f.started_now + f.projected > 0).sort((a, b) => b.behind_by - a.behind_by);
  const rest = forecast.filter((f) => f.status === "on_track" && f.started_now > 0);
  const fallback = forecast.filter((f) => f.status === "behind").sort((a, b) => b.behind_by - a.behind_by);
  return [...behind, ...rest, ...fallback].filter((f, i, all) => all.indexOf(f) === i).slice(0, 3);
}

export const CAUSE_TEXT: Record<SkillCause, string> = {
  cant_start: "hard to get started",
  wrong_approach: "wrong approach",
  edge_cases: "edge cases",
  too_slow: "too slow",
  forgetting: "forgetting",
};

const dayDiff = (from: string, to: string): number =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);

export const daysUntil = (date: string, today: string = localDay()): number => dayDiff(today, date);

export function shortDate(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
