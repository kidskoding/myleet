// The one place that says what a guest (signed-out visitor) can do. Pages ask
// `canUse` / `requireAccount` instead of checking sign-in state themselves.
import { signedIn } from "./account";

export type Tier = "guest" | "account";

export interface Rule {
  tier: Tier;
  /** Finishes "Sign up free" on the shared prompt; account features only. */
  reason?: string;
}

export const ACCESS = {
  learn: { tier: "guest" },
  companies: { tier: "guest" },
  notes: { tier: "guest" },
  solve: { tier: "guest" },
  diagnostic: { tier: "guest" },
  today: { tier: "guest" },
  "build-plan": { tier: "guest" },
  mock: { tier: "guest" },
  progress: { tier: "guest" },
  "save-plan": { tier: "account", reason: "Sign up to save this plan and have it follow you to every device." },
  "calendar-sync": { tier: "account", reason: "Sign up to add your plan to your calendar. It stays up to date as the plan changes." },
  "save-mock": { tier: "account", reason: "Sign up to save this score and add your misses to your plan." },
  "first-solve": { tier: "account", reason: "Sign up so this comes back for review in 1 day." },
  "review-history": { tier: "account", reason: "Sign up to schedule reviews and keep your progress history." },
  "pin-company": { tier: "account", reason: "Sign up to pin companies and keep them on every device." },
  "sync-settings": { tier: "account", reason: "Sign up to sync your settings across devices." },
  "asked-report": { tier: "account", reason: "Sign up to report that you were asked this problem." },
} as const satisfies Record<string, Rule>;

export type Feature = keyof typeof ACCESS;

export const canUse = (f: Feature, signed: boolean = signedIn()): boolean => ACCESS[f].tier === "guest" || signed;

export type PromptMode = "allow" | "sheet" | "link";

/** A feature's sheet shows once per session; after any dismissal only a quiet link does. */
export function promptMode(f: Feature, signed: boolean, shown: readonly string[], dismissed: boolean): PromptMode {
  if (canUse(f, signed)) return "allow";
  return dismissed || shown.includes(f) ? "link" : "sheet";
}

const SHOWN = "myleet:prompt-shown";
const DISMISSED = "myleet:prompt-dismissed";
const PENDING = "myleet:pending";

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, v: string | null): void {
  try {
    if (v === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, v);
  } catch {
    // No session storage: the prompt may repeat, nothing else breaks.
  }
}

export function dismissPrompt(): void {
  write(DISMISSED, "1");
}

const here = (): string => location.pathname + location.search + location.hash;

/** Sign-in or sign-up URL that returns to this exact page. */
export const signupHref = (mode: "signup" | "signin" = "signup"): string =>
  `/signin?${mode === "signup" ? "mode=signup&" : ""}next=${encodeURIComponent(here())}`;

/** The action to finish once the visitor is back and signed in. */
export function takePending(f?: Feature): Feature | null {
  const p = read(PENDING) as Feature | null;
  if (!p || (f ? p !== f : p === "calendar-sync")) return null; // calendar-sync is resumed by the plan page
  write(PENDING, null);
  return p;
}

/**
 * True when the feature is open to this visitor. Otherwise opens the sign-up sheet (or, if
 * they already dismissed one this session, a toast with a quiet link) and returns false.
 */
export function requireAccount(f: Feature, opts: { sheet?: boolean } = {}): boolean {
  const shown = (read(SHOWN) ?? "").split(",").filter(Boolean);
  const mode = promptMode(f, signedIn(), shown, read(DISMISSED) === "1");
  if (mode === "allow") return true;
  write(PENDING, f);
  const reason = (ACCESS[f] as Rule).reason ?? "";
  if (mode === "sheet" && opts.sheet !== false) {
    write(SHOWN, [...shown, f].join(","));
    void import("./ui/signup-prompt").then((m) => m.openSignupPrompt(reason, signupHref("signup"), signupHref("signin")));
  } else {
    void import("./ui/overlay").then((m) =>
      m.toast(reason, { action: { label: "Sign up free", run: () => location.assign(signupHref("signup")) } }),
    );
  }
  return false;
}
