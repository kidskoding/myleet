import type { PublicSummary } from "./progress";
import type { TrainerApi } from "./trainer";

export interface SideSummary {
  practised: number;
  mastered: number;
  streak: number;
  /** Latest finish, ms; null with no history. */
  lastMs: number | null;
}

export function sideSummary(t: TrainerApi, events: string, now = Date.now()): SideSummary {
  if (!events.trim()) return { practised: 0, mastered: 0, streak: 0, lastMs: null };
  const states = Object.values(t.states(events));
  const stats = t.stats(events, { now });
  const last = states.reduce<number | null>((m, s) => (s.last_ms !== null && (m === null || s.last_ms > m) ? s.last_ms : m), null);
  return {
    practised: states.filter((s) => s.status !== "unseen").length,
    mastered: stats.counts.mastered,
    streak: stats.streak,
    lastMs: last,
  };
}

/** What the Worker stores for the opt-in public profile. */
export function publicSummary(t: TrainerApi, events: string, now = Date.now()): PublicSummary {
  const stats = t.stats(events, { now });
  const { learning, reviewing, mastered } = stats.counts;
  return { streak: stats.streak, mastered, solved: learning + reviewing + mastered, heatmap: stats.heatmap };
}
