// The workspace's personalization slots (components/workspace mount options): the reason
// line under the title and "What this changes" in the result sheet.
import { attempts, parseEvents } from "../attempts";
import { planSettings } from "../prefs";
import { skillHref } from "../routes";
import type { TrainerApi } from "../trainer";
import { html, render } from "./html";
import { reasonLine, whatThisChanges } from "./personal";

interface Ctx {
  problem: string;
  events: string;
  trainer: TrainerApi;
}

/** The plan's reason for this problem (tag + sentence), or Today's reason line. */
export function renderReason(el: HTMLElement, c: Ctx): void {
  try {
    const plan = c.trainer.plan(c.events, planSettings());
    const item = plan.days.flatMap((d) => d.sessions).flatMap((s) => s.items).find((i) => i.problem === c.problem);
    if (item) {
      render(el, reasonLine(item));
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
