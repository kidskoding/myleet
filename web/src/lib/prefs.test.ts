import { beforeEach, describe, expect, it } from "vitest";
import { fromServer, isDefaultServer, toServer, type ServerSettings } from "./account";
import { memoryStorage } from "./memory-storage";
import {
  adoptAppearance,
  DEFAULT_PREFS,
  NIGHT_KEY,
  planSettings,
  readAccent,
  readNight,
  readPrefs,
  readTheme,
  resolvedFlavor,
  setAccent,
  setNight,
  setTheme,
  THEME_KEY,
  updatePrefs,
} from "./prefs";

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

describe("Mocha appearance", () => {
  it("always resolves to Mocha, including legacy and system preferences", () => {
    for (const pref of ["latte", "frappe", "macchiato", "mocha", "system"] as const) {
      localStorage.setItem(THEME_KEY, pref);
      expect(readTheme()).toBe("mocha");
      expect(resolvedFlavor(pref)).toBe("mocha");
      setTheme(pref);
      expect(localStorage.getItem(THEME_KEY)).toBe("mocha");
    }
  });
  it("does not restore a saved alternate night flavor", () => {
    setNight("frappe");
    expect(readNight()).toBe("mocha");
    expect(localStorage.getItem(NIGHT_KEY)).toBe("mocha");
  });
  it("keeps personal accent choices within Mocha", () => {
    expect(readAccent()).toBe("mauve");
    setAccent("teal");
    expect(readAccent()).toBe("teal");
    adoptAppearance({ theme: "latte", night: "frappe", accent: "peach" });
    expect([readTheme(), readNight(), readAccent()]).toEqual(["mocha", "mocha", "peach"]);
    adoptAppearance({ theme: "neon", accent: 3 });
    expect([readTheme(), readAccent()]).toEqual(["mocha", "peach"]);
  });
});

describe("prefs", () => {
  it("deep-merges patches over defaults", () => {
    updatePrefs({ editor: { keymap: "vim" }, plan: { companies: ["google"] } });
    const p = readPrefs();
    expect(p.editor.keymap).toBe("vim");
    expect(p.editor.fontSize).toBe(DEFAULT_PREFS.editor.fontSize);
    expect(p.plan.companies).toEqual(["google"]);
    expect(p.plan.sessionMinutes).toBe(45);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("myleet-prefs", "{nope");
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("round-trips the account settings and drops invalid windows", () => {
    updatePrefs({
      newPerDay: 4,
      plan: {
        interviewDate: "2026-12-07",
        dailyMinutes: 90,
        availability: [
          { days: ["mon"], start: "19:00", end: "20:00" },
          { days: [], start: "08:00", end: "09:00" },
          { days: ["sat"], start: "22:00", end: "21:00" },
        ],
      },
    });
    const server = { ...toServer(readPrefs()), theme: "system" } as ServerSettings;
    expect(server.availability).toEqual([{ days: ["mon"], start: "19:00", end: "20:00" }]);
    expect(planSettings().daily_minutes).toBe(90);
    globalThis.localStorage = memoryStorage();
    updatePrefs(fromServer(server));
    expect(readPrefs().plan.interviewDate).toBe("2026-12-07");
    expect(readPrefs().newPerDay).toBe(4);
    expect(isDefaultServer(server)).toBe(false);
    expect(isDefaultServer({ ...toServer(DEFAULT_PREFS), theme: "system" } as ServerSettings)).toBe(true);
  });
});
