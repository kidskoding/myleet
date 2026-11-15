// The opt-in LeetCode import. The Worker reads the public profile; the wasm core turns it
// into event lines (priors per module, recent solves as started problems). Nothing here
// ever sees a password or a cookie.
import { readPrefs, updatePrefs } from "./prefs";
import { appendEvent, readEvents } from "./progress";
import { localDay } from "./streak";
import { loadTrainer } from "./trainer";
import type { LeetcodeImport, LeetcodeProfile } from "./types";

const REFRESHED = "myleet-lc-refreshed";
const SUMMARY = "myleet-lc-summary";

export type Connected = { ok: true; summary: string; marked: number } | { ok: false; message: string };

/** "kidskoding", "@kidskoding" or a pasted profile link all name the same user. */
export function cleanUsername(raw: string): string {
  const t = raw.trim().replace(/^@/, "");
  const m = /leetcode\.(?:com|cn)\/(?:u\/)?([^/?#\s]+)/i.exec(t);
  return (m?.[1] ?? t).trim();
}

export const validUsername = (u: string): boolean => /^[A-Za-z0-9_.-]{1,40}$/.test(u);

function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // No storage: the summary is simply not kept for later.
  }
}

const load = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

async function fetchProfile(username: string): Promise<{ profile: LeetcodeProfile } | { message: string }> {
  let res: Response;
  try {
    res = await fetch(`/api/leetcode/profile?username=${encodeURIComponent(username)}`);
  } catch {
    return { message: "We couldn't reach LeetCode. Check your connection and try again" };
  }
  if (res.status === 404) return { message: "We couldn't find that LeetCode profile. Check the username, and that your profile is public" };
  if (res.status === 429) return { message: "That's a lot of lookups. Try again in a little while" };
  if (!res.ok) return { message: "LeetCode isn't answering right now. Try again soon" };
  return { profile: (await res.json()) as LeetcodeProfile };
}

async function apply(profile: LeetcodeProfile, reconnect: boolean) {
  const trainer = await loadTrainer();
  const out = trainer.leetcodeImport(await readEvents(), profile, { reconnect });
  for (const line of out.lines) await appendEvent(line);
  store(REFRESHED, localDay());
  return out;
}

/** Connects (or switches to) `raw`'s public profile and imports it. */
export async function connect(raw: string): Promise<Connected> {
  const username = cleanUsername(raw);
  if (!validUsername(username)) return { ok: false, message: "Enter your LeetCode username, like kidskoding" };
  const got = await fetchProfile(username);
  if (!("profile" in got)) return { ok: false, message: got.message };
  const out = await apply(got.profile, true);
  updatePrefs({ leetcodeUsername: got.profile.username });
  store(SUMMARY, out.summary);
  return { ok: true, summary: out.summary, marked: out.marked };
}

/** Re-reads the profile without touching markers already placed. */
export async function refresh(): Promise<Connected> {
  const username = readPrefs().leetcodeUsername;
  if (!username) return { ok: false, message: "LeetCode isn't connected" };
  const got = await fetchProfile(username);
  if (!("profile" in got)) return { ok: false, message: got.message };
  const out = await apply(got.profile, false);
  return { ok: true, summary: out.summary, marked: out.marked };
}

/** At most one refresh a day, quietly: a failure just waits for tomorrow's. */
export async function refreshIfDue(today = localDay()): Promise<void> {
  if (!readPrefs().leetcodeUsername || load(REFRESHED) === today) return;
  store(REFRESHED, today);
  await refresh().catch(() => undefined);
}

/** Forgets the username and voids the import and its markers. */
export async function disconnect(): Promise<void> {
  const trainer = await loadTrainer();
  await appendEvent(trainer.leetcodeDisconnect());
  updatePrefs({ leetcodeUsername: null });
  store(REFRESHED, null);
  store(SUMMARY, null);
}

export async function current(): Promise<LeetcodeImport | null> {
  const trainer = await loadTrainer();
  return trainer.leetcode(await readEvents());
}

/** The one-time line after connecting; reading it clears it. */
export function takeSummary(): string | null {
  const s = load(SUMMARY);
  if (s) store(SUMMARY, null);
  return s;
}
