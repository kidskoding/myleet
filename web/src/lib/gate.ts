// Pages that need an account. Base marks them `<html data-gated>`; the head script below
// sends a signed-out visit to /signin before first paint, using the cached account as the
// hint, and the shell checks again once `/api/me` answers.
import { isDefaultServer, type Me } from "./account";

/** Self-contained: GATE_BOOT inlines its source into the page head. */
export function gateRedirect(gated: boolean, auth: string | null | undefined, path: string, search: string): string | null {
  if (!gated || auth === "in") return null;
  return "/signin?next=" + encodeURIComponent(path + search);
}

export const GATE_BOOT = `(function () {
  var decide = ${gateRedirect.toString()};
  function check() {
    var r = document.documentElement;
    var to = decide(r.hasAttribute("data-gated"), r.dataset.auth, location.pathname, location.search);
    if (to) location.replace(to);
  }
  check();
  document.addEventListener("astro:after-swap", check);
})();`;

export const signinHref = (next: string): string => `/signin?next=${encodeURIComponent(next)}`;

/** A same-site path to continue to after sign-in; anything else becomes `fallback`. */
export function safeNext(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/^\/signin(?:[/?#]|$)/.test(raw)) return fallback;
  return raw;
}

/** How long after creating an account its first sign-in still counts as new. */
const NEW_ACCOUNT_MS = 30 * 60_000;

/** A brand-new account with nothing set up yet goes through onboarding first. */
export function isFreshAccount(me: Me, onboarded: boolean, now = Date.now()): boolean {
  return !onboarded && now - me.user.created_at < NEW_ACCOUNT_MS && isDefaultServer(me.settings);
}

export function afterSignIn(me: Me, next: string | null | undefined, onboarded: boolean, now = Date.now()): string {
  // Someone sent here from a page (a sign-up prompt) goes straight back to it.
  const back = safeNext(next, "");
  return isFreshAccount(me, onboarded, now) && !back ? "/onboarding" : back || "/app";
}
