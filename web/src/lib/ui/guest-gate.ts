// What a signed-out visitor sees on Today, Plan and Progress. Personalization is the reason
// to sign up, so a guest gets an invitation (no diagnostic yet) or their diagnostic results
// with a sign-up button, never a personal queue, countdown or plan.
import { signinHref } from "../gate";
import { midSentence } from "../schedule";
import { ROUTES } from "../routes";
import type { Level } from "../types";
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
  return `${a}${b}${second ? ` ${second.charAt(0).toUpperCase() + second.slice(1)} is next` : ""}`;
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

/** Numbered step cards: a title and a one-line description each. */
export const gateSteps = (steps: [string, string][]): SafeHtml => html`<ol class="gate-steps">${steps.map(([t, d]) => html`<li><strong>${t}</strong><span>${d}</span></li>`)}</ol>`;

export function todayInvite(greet: string, company: string | null = null): SafeHtml {
  return html`<section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${inviteCopy(company)}</p>${gateSteps(INVITE_STEPS)}
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${ROUTES.diagnostic}">Take the diagnostic</a><a class="link" href="${ROUTES.learn}">Skip and start at module 1</a></div></section>`;
}

export function todayResults(greet: string, line: string): SafeHtml {
  return html`<section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${line}</p>
    <p>A free account turns this into a plan: what to practice each day, when to review, and a schedule that fits your week</p>
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account to start your plan</a><a class="link" href="${ROUTES.diagnostic}">See your full results</a></div></section>`;
}

const GIVES: Record<"plan" | "progress", { h: string; lede: SafeHtml; steps: [string, string][] }> = {
  plan: {
    h: "Your plan",
    lede: html`A day-by-day schedule built around <strong>your interview</strong>, and it moves with you when a day goes sideways`,
    steps: [
      ["Paced to your interview date", "Every practice day builds toward it"],
      ["Fits your free hours", "Practice lands in the hours you say you have each week"],
      ["Starts where you're weakest", "What the diagnostic found decides what comes first"],
    ],
  },
  progress: {
    h: "Your progress",
    lede: html`Everything you practice is <strong>saved to your account</strong>, so it follows you to every device`,
    steps: [
      ["Your streak", "Days in a row you've practiced, right in the top bar"],
      ["Topic by topic", "See which patterns are solid and which are still climbing"],
      ["Reviews coming due", "Problems come back on a 1, 3, 7, 14, 30-day ladder after a clean pass"],
    ],
  },
};

/** Plan and Progress for a guest: what they get after signing up, laid out like the Today invitation. */
export function featureGate(kind: "plan" | "progress", diagnosticDone: boolean): SafeHtml {
  const g = GIVES[kind];
  return html`<section class="gate" aria-labelledby="gate-h"><h1 id="gate-h">${g.h}</h1><p class="lede">${g.lede}</p>${gateSteps(g.steps)}
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account</a>${diagnosticDone ? "" : html`<a class="link" href="${ROUTES.diagnostic}">Take the diagnostic first</a>`}</div></section>`;
}
