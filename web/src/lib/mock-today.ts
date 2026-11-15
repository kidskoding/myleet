// The "mock interview today" card: which state it is in at a given clock time.
export type MockState = "before" | "now" | "missed" | "done";

/** Minutes before the start when the card flips to "starts now" and the reminder fires. */
export const MOCK_LEAD_MIN = 10;

export function mockState(nowMs: number, startMs: number, endMs: number, done: boolean): MockState {
  if (done) return "done";
  if (nowMs >= endMs) return "missed";
  return nowMs >= startMs - MOCK_LEAD_MIN * 60_000 ? "now" : "before";
}
