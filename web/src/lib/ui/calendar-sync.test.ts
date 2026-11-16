import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "../memory-storage";
import { elide, eventPreview, renderSync, type SyncState } from "./calendar-sync";

const base: SyncState = { view: "none", status: { enabled: false, created_at: null, plan_updated_at: null }, links: null, confirm: null, busy: false, copied: false };
const LINKS = {
  https_url: "https://myleet.dev/api/calendar/k7QmAbCdEfGhIjKlMnOpQrStUvWxYzT2x.ics",
  webcal_url: "webcal://myleet.dev/api/calendar/k7QmAbCdEfGhIjKlMnOpQrStUvWxYzT2x.ics",
  google_url: "https://calendar.google.com/calendar/r?cid=x",
  outlook_url: "https://outlook.live.com/x",
  outlook365_url: "https://outlook.office.com/x",
  created_at: 1,
};

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
});

describe("calendar sync dialog", () => {
  it("asks a signed-out learner to sign in, nothing else", () => {
    const h = renderSync({ ...base, view: "signed-out" }, null).value;
    expect(h).toContain("Sign in to add");
    expect(h).not.toContain("data-provider");
  });
  it("offers the four providers before a link exists, with the one-way and Google facts", () => {
    const h = renderSync(base, null).value;
    for (const p of ["google", "apple", "outlook", "copy"]) expect(h).toContain(`data-provider="${p}"`);
    expect(h).toContain("One way:");
    expect(h).toContain("Google doesn't play alarms from subscribed calendars:");
    expect(h).not.toContain("Turn off link");
  });
  it("shows the link once, elided, then only rotate", () => {
    const fresh = renderSync({ ...base, view: "active", links: LINKS }, null).value;
    expect(fresh).toContain("k7Qm…T2x.ics");
    expect(fresh).not.toContain("AbCdEf");
    expect(fresh).toContain("Turn off link");
    const later = renderSync({ ...base, view: "active", status: { enabled: true, created_at: 1, plan_updated_at: null } }, null).value;
    expect(later).toContain("Your calendar link is on.");
    expect(later).not.toContain("linkrow");
    expect(renderSync({ ...base, view: "active", confirm: "rotate" }, null).value).toContain("The old link stops working.");
  });
  it("disables providers offline", () => {
    const h = renderSync({ ...base, view: "offline" }, null).value;
    expect(h).toContain("Available when you&#39;re online");
    expect(h.match(/data-provider="[a-z]+" disabled/g)?.length).toBe(4);
  });
  it("previews the event from the core's iCalendar text, alarm only when on", () => {
    const ics = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20261118T030000Z\r\nDTEND:20261118T040000Z\r\nSUMMARY:myleet · 1 review\\, 2 new (≈55 min)\r\nDESCRIPTION:Review: Course Schedule (12 min) - 3-day review is du\r\n e\\nhttps://x/p/a\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    const p = eventPreview(ics);
    expect(p?.summary).toBe("myleet · 1 review, 2 new (≈55 min)");
    expect(p?.description).toBe("Review: Course Schedule (12 min) - 3-day review is due\nhttps://x/p/a");
    localStorage.setItem("myleet-prefs", JSON.stringify({ plan: { reminderMinutes: null } }));
    expect(renderSync(base, p).value).not.toContain("Alarm");
    localStorage.setItem("myleet-prefs", JSON.stringify({ plan: { reminderMinutes: 15 } }));
    expect(renderSync(base, p).value).toContain("Alarm 15 min before");
    expect(elide("webcal://h/x/short.ics")).toBe("webcal://h/x/short.ics");
  });
});
