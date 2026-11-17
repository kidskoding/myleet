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

/**
 * An account with nothing set up yet (brand new, or just reset) goes through onboarding first.
 * The flag syncs, so a learner who finished setup on another device isn't asked again.
 */
export function needsSetup(me: Me, onboarded: boolean): boolean {
  return !onboarded && !me.settings.onboarded && isDefaultServer(me.settings);
}

export function afterSignIn(me: Me, next: string | null | undefined, onboarded: boolean): string {
  // Someone sent here from a page (a sign-up prompt) goes straight back to it.
  const back = safeNext(next, "");
  return needsSetup(me, onboarded) && !back ? "/onboarding" : back || "/app";
}
