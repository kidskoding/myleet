import { beforeEach, describe, expect, it } from "vitest";
import { fromServer, isDefaultServer, toServer, type ServerSettings } from "./account";
import { memoryStorage } from "./memory-storage";
import { DEFAULT_PREFS, planSettings, readPrefs, readTheme, setTheme, THEME_KEY, updatePrefs } from "./prefs";

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

describe("theme persistence", () => {
  it("defaults to system and remembers an explicit choice", () => {
    expect(readTheme()).toBe("system");
    setTheme("dark");
    expect(readTheme()).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("system removes the stored choice so the OS decides again", () => {
    setTheme("light");
    setTheme("system");
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(readTheme()).toBe("system");
  });

  it("ignores junk in storage", () => {
    localStorage.setItem(THEME_KEY, "purple");
    expect(readTheme()).toBe("system");
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
