// The workspace's personalization slots (components/workspace mount options): the reason
// line under the title and "What this changes" in the result sheet.
import { attempts, doneToday, parseEvents } from "../attempts";
import { signedIn } from "../account";
import { loadCatalog } from "../catalog";
import { wrapUp } from "../coach";
import { daysUntil } from "../plan";
import { planSettings, readPrefs } from "../prefs";
import { planDayHref, problemHref, ROUTES, skillHref } from "../routes";
import { nextReason, planChange, resultNote, type ResultKind } from "../sheet-note";
import { addDays, localDay } from "../streak";
import { EXTRA_NEW_FOR_LONG_DAY, readBudget, readSkipped } from "../today";
import type { TrainerApi } from "../trainer";
import type { Plan, TodayEntry } from "../types";
import { html, render } from "./html";
import { whatThisChanges } from "./personal";
import { companyMarks, type Marks } from "./emphasis";

interface Ctx {
  problem: string;
  events: string;
  trainer: TrainerApi;
}

/** The plan's reason for this problem, or Today's reason line. The bar's own tag already says Review, New or Practice. */
export function renderReason(el: HTMLElement, c: Ctx): void {
  try {
    const plan = c.trainer.plan(c.events, planSettings());
    const item = plan.days.flatMap((d) => d.sessions).flatMap((s) => s.items).find((i) => i.problem === c.problem);
    if (item) {
      render(el, html`${item.reason}`);
      el.title = item.reason;
      return;
    }
    const entry = c.trainer.today(c.events).find((e) => e.problem === c.problem);
    if (entry?.why) render(el, html`${entry.why.charAt(0).toUpperCase()}${entry.why.slice(1)}`);
  } catch {
    // The breadcrumb stays.
  }
}

/** "What this changes": the skill model before and after the attempt just recorded. */
export function renderChanges(el: HTMLElement, c: Ctx): void {
  try {
    const last = attempts(parseEvents(c.events))
      .filter((a) => a.problem === c.problem && a.end !== null)
      .sort((a, b) => (a.end ?? 0) - (b.end ?? 0))
      .at(-1);
    if (!last) return;
    const fb = c.trainer.attemptFeedback(c.events, last.id);
    if (fb) render(el, whatThisChanges(fb, { href: skillHref(fb.module, fb.technique) }));
  } catch {
    // The result sheet stands on its own.
  }
}

/** What the workspace knows about the attempt that just finished. */
export interface ResultAttempt {
  kind: ResultKind;
  passed: number;
  total: number;
  failing: string[];
  reviewDays: number;
  targetMins: number;
}

export interface ResultExtras {
  note: string | null;
  change: string | null;
  next: { href: string; title: string; reason: string } | null;
  /** Nothing is left today: the warm wrap-up, a way to see tomorrow, and one optional extra. */
  end: { text: string; tomorrowHref: string; extra: { href: string; title: string } | null } | null;
  /** Signed out: Next follows curriculum order and the sheet offers a free account. */
  guest: boolean;
  /** Logos for the learner's companies, for the lines that name them. */
  marks: Marks;
}

/** The plan before the attempt is recorded, for the "what changed" diff. */
export function snapshotPlan(c: Ctx): Plan | null {
  try {
    return c.trainer.plan(c.events, planSettings());
  } catch {
    return null;
  }
}

/** Today's queue, the way Today builds it, minus what's done or skipped. */
function queue(c: Ctx, now: Date, extraNew: number, doneIds: Set<string>): TodayEntry[] {
  const skipped = new Set(readSkipped(now));
  const bonus = readBudget(now) === "120" ? EXTRA_NEW_FOR_LONG_DAY : 0;
  return c.trainer
    .today(c.events, { newPerDay: readPrefs().newPerDay + bonus + extraNew })
    .filter((e) => e.kind !== "practice" && e.problem !== c.problem && !doneIds.has(e.problem) && !skipped.has(e.problem));
}

/** The personal pieces of the result sheet. Every piece is null when there's no data for it. */
export async function resultExtras(c: Ctx & { snapshot: Plan | null; attempt: ResultAttempt }): Promise<ResultExtras> {
  const now = new Date();
  const { catalog, byId } = await loadCatalog();
  const meta = byId.get(c.problem);
  const techTitle = (id: string) => {
    const m = byId.get(id);
    return m ? (catalog.modules[m.module]?.techniques[m.technique]?.title ?? null) : null;
  };
  const technique = techTitle(c.problem);
  const prefs = readPrefs().plan;
  const out: ResultExtras = { note: null, change: null, next: null, end: null, guest: false, marks: companyMarks(catalog.playlists, [...prefs.companies, ...prefs.interviews.map((i) => i.company)]) };

  let plan: Plan | null = null;
  try {
    plan = c.trainer.plan(c.events, planSettings());
  } catch {
    // Plan-based lines stay out.
  }
  try {
    const last = attempts(parseEvents(c.events))
      .filter((a) => a.problem === c.problem && a.end !== null)
      .sort((a, b) => (a.end ?? 0) - (b.end ?? 0))
      .at(-1);
    const fb = last ? c.trainer.attemptFeedback(c.events, last.id) : null;
    const skill = fb ? c.trainer.skills(c.events, planSettings()).techniques.find((s) => s.module === fb.module && s.technique === fb.technique) : null;
    const history = skill?.history ?? [];
    const today = localDay(now);
    const item = plan?.days.flatMap((d) => d.sessions).flatMap((s) => s.items).find((i) => i.problem === c.problem);
    const company = item?.chips?.map((x) => /^(.+) leans on /.exec(x.text)?.[1]).find(Boolean) ?? null;
    const edge = [...history].reverse().find((h) => h.cause === "edge_cases" && h.problem !== c.problem && h.date >= addDays(today, -14));
    out.note = resultNote({
      ...c.attempt,
      // Test names often start with the function name (test_two_sum_empty); that's not the case.
      failing: c.attempt.passed ? c.attempt.failing.map((t) => t.replace(c.problem.replace(/-/g, "_"), "")) : [],
      technique,
      cleanThisWeek: history.filter((h) => h.mark === "clean" && h.date >= addDays(today, -6)).length,
      levelAfter: fb?.after ?? null,
      attempts: skill?.evidence.attempts ?? 0,
      priorEdge: edge ? { title: edge.title, date: edge.date } : null,
      company,
      daysLeft: plan?.interview_date ? daysUntil(plan.interview_date, today) : null,
      now,
    });
    if (signedIn()) out.change = planChange(c.snapshot, plan, technique);
  } catch {
    // The sheet keeps its plain copy.
  }

  if (!signedIn()) {
    const i = catalog.problems.findIndex((p) => p.id === c.problem);
    const after = i >= 0 ? catalog.problems[i + 1] : undefined;
    out.guest = true;
    if (after) out.next = { href: problemHref(after.id), title: after.title, reason: "The next one in the curriculum" };
    return out;
  }
  const evs = parseEvents(c.events);
  const done = doneToday(evs, (id) => byId.get(id)?.time_target_secs ?? 0, now);
  const doneIds = new Set(done.map((d) => d.problem));
  const weak = new Set<string>();
  try {
    for (const s of c.trainer.skills(c.events, planSettings()).techniques) if (s.weak_spot) weak.add(s.technique_title);
  } catch {
    // No weak-spot line.
  }
  const next = queue(c, now, 0, doneIds)[0];
  const nm = next ? byId.get(next.problem) : undefined;
  if (next && nm) {
    const nTech = techTitle(next.problem);
    out.next = {
      href: problemHref(next.problem),
      title: nm.title,
      reason: nextReason({
        title: nm.title,
        kind: next.kind,
        technique: nTech,
        difficulty: nm.difficulty,
        overdueDays: next.overdue_days,
        started: next.state.attempts > 0,
        weak: !!nTech && weak.has(nTech),
        currentTechnique: technique,
        currentDifficulty: meta?.difficulty ?? "",
      }),
    };
    return out;
  }
  const extra = queue(c, now, 1, doneIds).find((e) => e.kind === "new");
  const em = extra ? byId.get(extra.problem) : undefined;
  const clean = done.filter((d) => d.finish === "clean").length;
  const minutes = done.reduce((n, d) => n + (d.elapsedMs ?? 0), 0) / 60_000;
  out.end = {
    text: wrapUp({ clean, total: done.length, minutes }, null, now).text,
    tomorrowHref: plan?.days[1] ? planDayHref(plan.days[1].date) : ROUTES.plan,
    extra: extra && em ? { href: problemHref(extra.problem), title: em.title } : null,
  };
  return out;
}
