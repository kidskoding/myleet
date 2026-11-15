// What a signed-out visitor sees on Today, Plan and Progress. Personalization is the reason
// to sign up, so a guest gets an invitation (no diagnostic yet) or their diagnostic results
// with a sign-up button, never a personal queue, countdown or plan.
import { signinHref } from "../gate";
import { midSentence } from "../schedule";
import { ROUTES } from "../routes";
import type { Level } from "../types";
import { tag } from "./bits";
import { html, type SafeHtml } from "./html";

export type GuestMode = "member" | "invite" | "results";

export const guestMode = (signed: boolean, diagnosticDone: boolean): GuestMode => (signed ? "member" : diagnosticDone ? "results" : "invite");

/** One-time flag: a guest saw their results, so after sign-up Today welcomes them. */
export const WELCOME_KEY = "myleet:welcome";

const list = (xs: string[]): string => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** "You're solid on arrays and hashing, and sliding window is where you'll grow fastest. Two pointers is next." */
export function resultsLine(items: { topic: string; level: Level }[], name: (topic: string) => string): string {
  const by = (l: Level) => items.filter((i) => i.level === l).map((i) => midSentence(name(i.topic)));
  const strong = by("strong").slice(0, 2);
  const grow = [...by("shaky"), ...by("start here")];
  const [first, second] = grow;
  const a = strong.length ? `You're solid on ${list(strong)}` : "Nothing is locked in yet, which is a fine place to start";
  if (!first) return `${a}, so your plan starts with the patterns asked most often in interviews.`;
  const b = strong.length ? `, and ${first} is where you'll grow fastest.` : `, and ${first} is where we'll begin.`;
  return `${a}${b}${second ? ` ${second.charAt(0).toUpperCase() + second.slice(1)} is next.` : ""}`;
}

export const signupToToday = (): string => `${signinHref(ROUTES.today)}&mode=signup`;

/** The diagnostic invitation, aimed at their target company when onboarding named one. */
export function inviteCopy(company: string | null): SafeHtml {
  const where = company ? `for your ${company} interview` : "in your interview prep";
  return html`To find out where you stand ${where}, we'll start with a <strong>diagnostic test</strong>!`;
}

const INVITE_STEPS: [string, string][] = [
  ["About 15 minutes", "Eight quick questions on which pattern fits, then two or three real problems you code and run"],
  ["Your map, topic by topic", "See what you already know and where you'll grow fastest"],
  ["A plan built for you", "Every day starts with the right problem, paced to your interview"],
];

export function todayInvite(greet: string, company: string | null = null): SafeHtml {
  return html`<section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${inviteCopy(company)}</p><ol class="gate-steps">${INVITE_STEPS.map(([t, d]) => html`<li><strong>${t}</strong><span>${d}</span></li>`)}</ol>
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${ROUTES.diagnostic}">Take the diagnostic</a><a class="link" href="${ROUTES.learn}">Skip and start at module 1</a></div></section>`;
}

export function todayResults(greet: string, line: string): SafeHtml {
  return html`<section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${line}</p>
    <p>A free account turns this into a plan: what to practice each day, when to review, and a schedule that fits your week.</p>
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account to start your plan</a><a class="link" href="${ROUTES.diagnostic}">See your full results</a></div></section>`;
}

const GIVES = {
  plan: {
    h: "Your plan",
    lede: "A day-by-day schedule built around your interview date, your free hours and what the diagnostic found. It moves with you when a day goes sideways.",
    rows: [["Mon", "Sliding window", "2 new, 3 reviews"], ["Tue", "Two pointers", "3 new, 2 reviews"], ["Wed", "Rest day", ""]],
  },
  progress: {
    h: "Your progress",
    lede: "Your streak, which topics are solid, and the reviews coming due, all saved to your account so they follow you to every device.",
    rows: [["Arrays and hashing", "Solid", ""], ["Sliding window", "Climbing", ""], ["Two pointers", "Started", ""]],
  },
} as const;

/** Plan and Progress for a guest: what they get after signing up, with a labelled example. */
export function featureGate(kind: "plan" | "progress", diagnosticDone: boolean): SafeHtml {
  const g = GIVES[kind];
  return html`<section class="gate" aria-labelledby="gate-h"><h1 id="gate-h">${g.h}</h1><p class="lede">${g.lede}</p>
    <div class="panel gate-eg" role="img" aria-label="Example ${kind}">${tag("outline", "Example")}
      <ul>${g.rows.map(([a, b, c]) => html`<li><b>${a}</b><span>${b}</span>${c ? html`<span class="text-muted">${c}</span>` : ""}</li>`)}</ul></div>
    <div class="gate-actions">${diagnosticDone ? "" : html`<a class="btn btn-secondary btn-lg" href="${ROUTES.diagnostic}">Take the diagnostic</a>`}<a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account</a></div></section>`;
}
