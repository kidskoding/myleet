import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "./prefs";
import { toServer, type Me, type ServerSettings } from "./account";
import { afterSignIn, GATE_BOOT, gateRedirect, isFreshAccount, safeNext, signinHref } from "./gate";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const settings = { theme: "system", editor_font_size: 14, ...toServer(DEFAULT_PREFS) } as ServerSettings;
const me = (createdAgoMs: number, s: Partial<ServerSettings> = {}): Me => ({
  user: { id: "u", email: "a@b.dev", username: "a", display_name: null, avatar_url: null, created_at: NOW - createdAgoMs },
  providers: ["github"],
  settings: { ...settings, ...s },
});

describe("gate", () => {
  it("lets public pages and signed-in visits through", () => {
    expect(gateRedirect(false, "out", "/learn", "")).toBeNull();
    expect(gateRedirect(true, "in", "/app", "")).toBeNull();
  });

  it("sends signed-out visits to sign-in with the page as next", () => {
    expect(gateRedirect(true, "out", "/plan", "?week=2")).toBe("/signin?next=%2Fplan%3Fweek%3D2");
    expect(gateRedirect(true, undefined, "/app", "")).toBe("/signin?next=%2Fapp");
    expect(signinHref("/onboarding")).toBe("/signin?next=%2Fonboarding");
  });

  it("inlines a working head script", () => {
    const replaced: string[] = [];
    const listeners: (() => void)[] = [];
    const run = (gated: boolean, auth?: string) =>
      new Function("document", "location", GATE_BOOT)(
        { documentElement: { hasAttribute: () => gated, dataset: { auth } }, addEventListener: (_: string, f: () => void) => listeners.push(f) },
        { pathname: "/mock", search: "", replace: (u: string) => replaced.push(u) },
      );
    run(false, "out");
    run(true, "in");
    expect(replaced).toEqual([]);
    run(true, "out");
    expect(replaced).toEqual(["/signin?next=%2Fmock"]);
    expect(listeners).toHaveLength(3);
  });
});

describe("next", () => {
  it("keeps same-site paths and rejects the rest", () => {
    expect(safeNext("/plan#2026-11-16")).toBe("/plan#2026-11-16");
    expect(safeNext("/onboarding")).toBe("/onboarding");
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "/signin", "/signin?next=/app"])
      expect(safeNext(bad)).toBe("/app");
    expect(safeNext("/signing-up")).toBe("/signing-up");
    expect(safeNext(null, "/")).toBe("/");
  });
});

describe("after sign-in", () => {
  it("sends a brand-new account to onboarding", () => {
    expect(isFreshAccount(me(60_000), false, NOW)).toBe(true);
    expect(afterSignIn(me(60_000), "/app", false, NOW)).toBe("/onboarding");
  });

  it("sends everyone else to next, or Today", () => {
    expect(afterSignIn(me(60_000), "/plan", true, NOW)).toBe("/plan");
    expect(afterSignIn(me(90 * 86_400_000), "/plan", false, NOW)).toBe("/plan");
    expect(afterSignIn(me(60_000, { interview_date: "2027-01-10" }), null, false, NOW)).toBe("/app");
  });
});

describe("sign-in methods", () => {
  it("shows only the providers the Worker reports as set up", async () => {
    const { fetchProviders, signInMethods } = await import("./account");
    expect(signInMethods({ github: true, google: false, email: false })).toEqual({ oauth: ["github"], email: false });
    expect(signInMethods({ github: true, google: true, email: true })).toEqual({ oauth: ["github", "google"], email: true });
    expect(signInMethods({ github: false, google: false, email: false })).toEqual({ oauth: [], email: false });
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch;
    try {
      expect(await fetchProviders()).toEqual({ github: true, google: true, email: true });
    } finally {
      globalThis.fetch = real;
    }
  });
});
