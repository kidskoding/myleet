// Guests no longer get an example day: personal views need an account, so the learner's
// own events are the only events.
import type { LoadedCatalog } from "./catalog";
import type { TrainerApi } from "./trainer";

export function viewEvents(_t: TrainerApi, _cat: LoadedCatalog, real: string): { events: string; sample: boolean } {
  return { events: real, sample: false };
}
