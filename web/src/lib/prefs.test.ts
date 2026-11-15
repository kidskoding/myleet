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

describe("Macchiato appearance", () => {
  it("always resolves to Macchiato, including legacy and system preferences", () => {
    for (const pref of ["latte", "frappe", "macchiato", "mocha", "system"] as const) {
      localStorage.setItem(THEME_KEY, pref);
      expect(readTheme()).toBe("macchiato");
      expect(resolvedFlavor(pref)).toBe("macchiato");
      setTheme(pref);
      expect(localStorage.getItem(THEME_KEY)).toBe("macchiato");
    }
  });
  it("does not restore a saved alternate night flavor", () => {
    setNight("frappe");
    expect(readNight()).toBe("macchiato");
    expect(localStorage.getItem(NIGHT_KEY)).toBe("macchiato");
  });
  it("keeps personal accent choices within Macchiato", () => {
    expect(readAccent()).toBe("mauve");
    setAccent("teal");
    expect(readAccent()).toBe("teal");
    adoptAppearance({ theme: "latte", night: "frappe", accent: "peach" });
    expect([readTheme(), readNight(), readAccent()]).toEqual(["macchiato", "macchiato", "peach"]);
    adoptAppearance({ theme: "neon", accent: 3 });
    expect([readTheme(), readAccent()]).toEqual(["macchiato", "peach"]);
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
        aims: ["companies", "sharp"],
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
    // The goals picked follow the account to a new device.
    expect(readPrefs().plan.aims).toEqual(["companies", "sharp"]);
    expect(isDefaultServer(server)).toBe(false);
    expect(isDefaultServer({ ...toServer(DEFAULT_PREFS), theme: "system" } as ServerSettings)).toBe(true);
  });
});

describe("interviews", () => {
  it("migrates a single saved date to one interview with no company", () => {
    localStorage.setItem("myleet-prefs", JSON.stringify({ plan: { interviewDate: "2099-02-13" } }));
    expect(readPrefs().plan.interviews).toEqual([{ date: "2099-02-13", company: null }]);
  });

  it("keeps the next date and the list in step", () => {
    updatePrefs({ plan: { interviews: [{ date: "2099-03-02", company: "stripe" }, { date: "2099-02-13", company: "meta" }] } });
    expect(readPrefs().plan.interviewDate).toBe("2099-02-13");
    expect(planSettings().interviews?.map((i) => i.company)).toEqual(["meta", "stripe"]);
    // A preset moves the next interview and keeps its company.
    updatePrefs({ plan: { interviewDate: "2099-02-20" } });
    expect(readPrefs().plan.interviews[0]).toEqual({ date: "2099-02-20", company: "meta" });
    // "No date" drops only the next one.
    updatePrefs({ plan: { interviewDate: null } });
    expect(readPrefs().plan.interviews).toEqual([{ date: "2099-03-02", company: "stripe" }]);
    expect(readPrefs().plan.interviewDate).toBe("2099-03-02");
  });
});

describe("plan history and day records", () => {
  const server = (extra: Partial<ServerSettings>) => ({ ...toServer(readPrefs()), theme: "system", ...extra }) as ServerSettings;

  it("unions history by entry and keeps the newest record per day", () => {
    const a = { date: "2099-01-01", kind: "date" as const, text: "Set the interview for Feb 13" };
    const b = { date: "2099-01-05", kind: "time" as const, text: "Daily time from 1 hour to 2 hours on weekdays" };
    updatePrefs({ plan: { history: [a] } });
    localStorage.setItem("myleet:plan-ledger", JSON.stringify({ "2099-01-02": { minutes: 60, sessions: 2, at: 100 }, "2099-01-03": { minutes: 30, sessions: 1, at: 50 } }));
    updatePrefs(fromServer(server({ plan_history: [b, a], plan_ledger: { "2099-01-02": { minutes: 45, sessions: 1, at: 200 }, "2099-01-04": { minutes: 20, sessions: 1, at: 10 } } })));
    expect(readPrefs().plan.history).toEqual([a, b]);
    expect(JSON.parse(localStorage.getItem("myleet:plan-ledger") ?? "{}")).toEqual({
      "2099-01-02": { minutes: 45, sessions: 1, at: 200 },
      "2099-01-03": { minutes: 30, sessions: 1, at: 50 },
      "2099-01-04": { minutes: 20, sessions: 1, at: 10 },
    });
    expect(toServer(readPrefs()).plan_history).toEqual([a, b]);
  });
});
