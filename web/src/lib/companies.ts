// Company prep pages: which entries are tracked, how ready the learner is on each, and which
// techniques the set leans on. Pure, so it is unit-tested without a DOM.
import { attempts, finishOf, type Ev } from "./attempts";
import { isDue, pstatus } from "./learn";
import type { Catalog, Playlist, Skill, State } from "./types";

export type EntryState = "ready" | "climbing" | "started" | "unseen" | "untracked";

/**
 * Ready = mastered, or on the ladder with a clean latest finish. `lastClean` holds the
 * problems whose most recent finished attempt was clean.
 */
export function entryState(st: State | undefined, lastClean: boolean): Exclude<EntryState, "untracked"> {
  const s = pstatus(st);
  if (s === "mastered") return "ready";
  if (s === "climbing") return lastClean ? "ready" : "climbing";
  return s;
}

/** Problems whose latest finished attempt (practice, drill or interview) was clean. */
export function lastCleanSet(events: Ev[], targetSecs: (id: string) => number): Set<string> {
  const latest = new Map<string, { at: number; clean: boolean }>();
  for (const a of attempts(events)) {
    if (a.end === null || !["practice", "drill", "interview"].includes(a.mode)) continue;
    const f = finishOf(a, targetSecs(a.problem));
    if (!f) continue;
    const prev = latest.get(a.problem);
    if (!prev || prev.at <= a.end) latest.set(a.problem, { at: a.end, clean: f === "clean" });
  }
  return new Set([...latest].filter(([, v]) => v.clean).map(([k]) => k));
}

export interface Readiness {
  tracked: number;
  untracked: number;
  ready: number;
  mastered: number;
  climbing: number;
  started: number;
  unseen: number;
  due: number;
}

export function readiness(p: Playlist, c: Catalog, states: Record<string, State>, clean: Set<string>, now: number): Readiness {
  const r: Readiness = { tracked: 0, untracked: 0, ready: 0, mastered: 0, climbing: 0, started: 0, unseen: 0, due: 0 };
  for (const e of p.entries) {
    const meta = e.problem === null ? undefined : c.problems[e.problem];
    if (!meta) {
      r.untracked += 1;
      continue;
    }
    r.tracked += 1;
    const st = states[meta.id];
    const s = pstatus(st);
    if (s === "mastered") r.mastered += 1;
    else if (s === "climbing") r.climbing += 1;
    else if (s === "started") r.started += 1;
    else r.unseen += 1;
    if (entryState(st, clean.has(meta.id)) === "ready") r.ready += 1;
    if (isDue(st, now)) r.due += 1;
  }
  return r;
}

export type LeanStatus = { kind: "ready" } | { kind: "building" } | { kind: "not-started"; n: number };

export interface Lean {
  module: string;
  technique: string;
  title: string;
  count: number;
  ready: number;
  /** 0-1 from the skill model, when it has a reading. */
  mastery: number | null;
  status: LeanStatus;
}

/**
 * Techniques of all the set's tracked problems, most problems first. Ready when at least 60%
 * of the technique's set problems are ready; "not started on N" when N of them are untouched.
 */
export function leans(p: Playlist, c: Catalog, states: Record<string, State>, clean: Set<string>, skills: Skill[] = []): Lean[] {
  const by = new Map<string, Lean & { unseen: number }>();
  for (const e of p.entries) {
    const meta = e.problem === null ? undefined : c.problems[e.problem];
    const m = meta ? c.modules[meta.module] : undefined;
    const t = m?.techniques[meta?.technique ?? -1];
    if (!meta || !m || !t) continue;
    const key = `${m.id}/${t.id}`;
    const l = by.get(key) ?? { module: m.id, technique: t.id, title: t.title, count: 0, ready: 0, unseen: 0, mastery: null, status: { kind: "building" } };
    l.count += 1;
    const s = entryState(states[meta.id], clean.has(meta.id));
    if (s === "ready") l.ready += 1;
    if (s === "unseen") l.unseen += 1;
    by.set(key, l);
  }
  const skill = new Map(skills.map((s) => [`${s.module}/${s.technique}`, s]));
  return [...by.entries()]
    .map(([key, l]) => {
      const status: LeanStatus = l.ready / l.count >= 0.6 ? { kind: "ready" } : l.unseen > 0 && l.unseen === l.count - l.ready ? { kind: "not-started", n: l.unseen } : { kind: "building" };
      const { unseen: _unseen, ...rest } = l;
      return { ...rest, mastery: skill.get(key)?.mastery ?? null, status };
    })
    .sort((a, b) => b.count - a.count);
}

export type FocusTag = "weak" | "new" | "building" | "strong";
export const FOCUS_TEXT: Record<FocusTag, string> = { weak: "Weak spot", new: "New to you", building: "Building", strong: "Strong" };
export type Focus = Lean & { tag: FocusTag; score: number };

/**
 * The set's techniques in the order the plan picks new work for this company: how much you
 * need it times how much the set uses it, plus a bonus for weak ones (planner::priority in
 * crates/core). With no skill reading a technique counts as fully needed.
 */
export function focusOrder(l: Lean[], skills: Skill[]): Focus[] {
  const max = Math.max(1, ...l.map((x) => x.count));
  const by = new Map(skills.map((s) => [`${s.module}/${s.technique}`, s]));
  return l
    .map((x) => {
      const s = by.get(`${x.module}/${x.technique}`);
      const tag: FocusTag = s?.weak_spot ? "weak" : !s || s.seen === 0 || s.level === "new" ? "new" : s.level === "solid" || s.level === "strong" ? "strong" : "building";
      return { ...x, tag, score: (s?.need ?? 1) * (1 + x.count / max) + (s?.weak ? 0.5 : 0) };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count);
}

/** The next problem to practice for this company: the first not-ready one in the top focus technique that has one. */
export function focusNext(p: Playlist, c: Catalog, focus: Focus[], ready: (id: string) => boolean): string | null {
  for (const f of focus) {
    for (const e of p.entries) {
      const meta = e.problem === null ? undefined : c.problems[e.problem];
      const m = meta ? c.modules[meta.module] : undefined;
      if (meta && m?.id === f.module && m.techniques[meta.technique]?.id === f.technique && !ready(meta.id)) return meta.id;
    }
  }
  return null;
}

export const leanText = (s: LeanStatus): string => (s.kind === "ready" ? "Ready" : s.kind === "building" ? "Building" : `Not started on ${s.n}`);

/** Problems a day to make every tracked entry ready by the date; null without a future date. */
export function perDay(notReady: number, daysLeft: number | null): number | null {
  if (daysLeft === null || daysLeft <= 0) return null;
  return Math.max(1, Math.ceil(notReady / daysLeft));
}
