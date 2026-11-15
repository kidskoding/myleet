// What a guest with no practice yet sees on Today and Progress: a small, labelled example
// history built from the first problems in the curriculum. It is never saved or synced.
import { signedIn } from "./account";
import type { LoadedCatalog } from "./catalog";
import type { TrainerApi } from "./trainer";

const DAY_MS = 86_400_000;
const SAMPLE_PROBLEMS = 8;

export function sampleEvents(t: TrainerApi, cat: LoadedCatalog, now = Date.now()): string {
  const lines: string[] = [];
  cat.catalog.problems.slice(0, SAMPLE_PROBLEMS).forEach((p, i) => {
    const at = now - (SAMPLE_PROBLEMS - i) * DAY_MS * 0.6;
    const attempt = `sample${i}`;
    const base = { problem: p.id, attempt, mode: "practice" as const };
    lines.push(t.eventLine({ ...base, kind: "opened", now: at - 600_000 }));
    lines.push(t.eventLine({ ...base, kind: "passed", data: { elapsed_ms: "600000" }, now: at }));
  });
  return lines.join("\n") + "\n";
}

/** The learner's own events, or the example when a guest has none yet. */
export function viewEvents(t: TrainerApi, cat: LoadedCatalog, real: string): { events: string; sample: boolean } {
  if (signedIn() || real.trim()) return { events: real, sample: false };
  return { events: sampleEvents(t, cat), sample: true };
}
