// What a signed-out visitor sees on Today, Plan and Progress. Personalization is the reason
// to sign up, so a guest gets an invitation (no diagnostic yet) or their diagnostic results
// with a sign-up button, never a personal queue, countdown or plan.
import { signinHref } from "../gate";
import { companyLogo } from "../company-logos";
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
  return html`Start with a <strong>diagnostic test</strong> to see what you know and where to focus${company ? ` as you work toward ${company}` : ""}`;
}

const INVITE_STEPS: [string, string][] = [
  ["About 15 minutes", "Two or three real interview problems you code and run, after a few quick warm-up questions"],
  ["Your map, topic by topic", "See what you already know and where you'll grow fastest"],
  ["A plan built for you", "Practice builds on what you know and fits the time you have"],
];

/** Numbered step cards: a title and a one-line description each. */
export const gateSteps = (steps: [string, string][]): SafeHtml => html`<ol class="gate-steps">${steps.map(([t, d]) => html`<li><strong>${t}</strong><span>${d}</span></li>`)}</ol>`;

/** A labelled preview of the personal Today a learner gets after the diagnostic. */
function todayExample(company: string | null, slug: string | null): SafeHtml {
  const co = company ?? "Meta";
  const logo = companyLogo(company ? (slug ?? "meta") : "meta");
  const row = (title: string, kind: "due" | "weak" | "new", tag: string, why: string) =>
    html`<li><div><strong>${title}</strong><span>${why}</span></div><span class="eg-tag ${kind}">${tag}</span></li>`;
  return html`<figure class="gate-eg-today" aria-label="Example of your Today after the diagnostic">
    <div class="eg-window" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i><span>Your Today, after the diagnostic</span></div>
    <div class="eg-body">
      <p class="eg-hello">Good evening, Alex</p>
      <p class="eg-note">Today we're focusing on <strong>sliding window</strong>, your weakest spot right now. Your <strong>${co}</strong> interview is <strong>12 days</strong> away, so we'll start with two quick reviews and then work through three window problems</p>
      <div class="eg-ready"><div class="eg-ready-top"><span class="eg-ready-h">${logo}Ready for ${co}</span><strong>62%</strong></div><div class="eg-bar"><span style="width:62%"></span></div></div>
      <ul class="eg-queue">
        ${row("Longest Substring Without Repeating Characters", "due", "Review", "You needed a hint here 6 days ago, so a clean pass puts it one step from mastered")}
        ${row("Minimum Window Substring", "weak", "Weak spot", "The shrink step you missed on Tuesday, one level harder")}
        ${row("Sliding Window Maximum", "new", "New", "Next in sliding window, and it shows up in " + co + "'s set")}
      </ul>
    </div>
  </figure>`;
}

export function todayInvite(greet: string, company: string | null = null, slug: string | null = null): SafeHtml {
  return html`<div class="gate-split"><section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${inviteCopy(company)}</p>${gateSteps(INVITE_STEPS)}
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${ROUTES.diagnostic}">Take the diagnostic</a><a class="link" href="${ROUTES.learn}">Skip and start at module 1</a></div></section>${todayExample(company, slug)}</div>`;
}

export function todayResults(greet: string, line: string): SafeHtml {
  return html`<section class="gate" aria-labelledby="greet"><h1 id="greet">${greet}</h1><p class="lede">${line}</p>
    <p>A free account turns this into a plan: what to practice each day, when to review, and a schedule that fits your week</p>
    <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account to start your plan</a><a class="link" href="${ROUTES.diagnostic}">See your full results</a></div></section>`;
}

const GIVES: Record<"plan" | "progress", { h: string; lede: SafeHtml; steps: [string, string][] }> = {
  plan: {
    h: "Your plan",
    lede: html`Tell us what you're working toward and when you're free, and we'll lay out every day for you. If an interview is coming up, we pace you to be <strong>ready by the date</strong>, and if you're aiming for a company someday, we help you build <strong>a habit that sticks</strong>`,
    steps: [
      ["Built for what you’re working toward", "An interview on a date, a few dream companies, the topics you want to get better at, or all of them at once"],
      ["Fits your availability", "Practice lands in the hours you say you have each week"],
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
