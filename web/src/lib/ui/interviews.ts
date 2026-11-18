// The interviews list: each row a date, an optional start time and an optional company, picked with the company
// search. Used by Settings, onboarding and Change plan; the caller decides where it saves.
import { requireAccount } from "../access";
import { findInterviews, type FoundInterview } from "../account";
import { companySlug, listedCompany } from "../catalog";
import { clock, toMin } from "../schedule";
import { companyLogo } from "../company-logos";
import { addDays, localDay } from "../streak";
import type { Interview, Playlist } from "../types";
import { pickCompany } from "./company-picker";
import { html, render } from "./html";
import { icon } from "./icons";

type Company = Pick<Playlist, "id" | "title" | "group">;

export interface InterviewsOpts {
  get: () => Interview[];
  set: (list: Interview[]) => void;
  /** Prefix for input ids, so two editors can share a page. */
  id: string;
}

export const companyTitle = (companies: Company[], slug: string | null): string | null =>
  slug ? (companies.find((c) => companySlug(c.id) === slug)?.title ?? slug) : null;

/** The company an event title names, longest name first so "Capital One" beats "One". */
export function companyIn(title: string, companies: Company[]): string | null {
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9&]+/g, " ")} `;
  const hit = [...companies]
    .sort((a, b) => b.title.length - a.title.length)
    .find((c) => t.includes(` ${c.title.toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim()} `));
  return hit ? companySlug(hit.id) : null;
}

const CONNECT_FIND = "/api/calendar/google/connect?interviews=1";
const when = (f: FoundInterview): string =>
  `${new Date(`${f.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${f.time ? ` · ${clock(toMin(f.time))}` : ""}`;

// "Find interviews in Google Calendar" lives outside any one list, since pages rebuild
// their interview lists (Settings does once its data loads) and the results must survive.
const search: { finding: boolean; found: FoundInterview[] | null; note: string } = { finding: false, found: null, note: "" };
const SEARCHED = "myleet:iv-search";
let returned = false;

async function runFind(taken: () => Interview[]): Promise<void> {
  if (!requireAccount("calendar-sync")) return;
  Object.assign(search, { finding: true, note: "" });
  dispatchEvent(new Event(SEARCHED));
  try {
    const r = await findInterviews();
    if (!r.connected || r.access === false) {
      location.href = CONNECT_FIND;
      return;
    }
    search.found = r.found ?? [];
    if (!search.found.some((f) => !taken().some((iv) => iv.date === f.date))) search.note = "No interviews in your Google Calendar for the next 3 months. Add one above";
  } catch {
    search.note = "Google Calendar isn't answering right now. Try again soon";
  }
  search.finding = false;
  dispatchEvent(new Event(SEARCHED));
}

export function mountInterviews(host: HTMLElement, playlists: Company[], o: InterviewsOpts): { refresh: () => void } {
  const companies = playlists.filter(listedCompany);
  const fresh = (): FoundInterview[] => (search.found ?? []).filter((f) => !o.get().some((iv) => iv.date === f.date));
  const find = (): Promise<void> => runFind(o.get);
  addEventListener(SEARCHED, () => host.isConnected && paint());
  const paint = (): void => {
    const list = o.get();
    const rows = list.length ? list : [{ date: "", company: host.dataset.pending || null }];
    render(
      host,
      html`<ul class="iv-list">${rows.map((iv, i) => {
        const name = companyTitle(companies, iv.company);
        return html`<li class="iv-row"><label class="visually-hidden" for="${o.id}-d${i}">Interview ${i + 1} date</label><input class="input" type="date" id="${o.id}-d${i}" min="${localDay()}" value="${iv.date}" data-iv-date="${i}" />
          <label class="visually-hidden" for="${o.id}-t${i}">Interview ${i + 1} start time</label><input class="input" type="time" id="${o.id}-t${i}" value="${iv.time ?? ""}" data-iv-time="${i}" ${iv.date ? "" : "disabled"} />
          <button type="button" class="company-trigger iv-co" data-iv-co="${i}" aria-haspopup="dialog">${iv.company ? html`${companyLogo(iv.company)}<span>${name}</span>` : html`<span class="text-secondary">No specific company</span>`}<span aria-hidden="true">⌕</span></button>
          ${list.length ? html`<button type="button" class="icon-btn" data-iv-remove="${i}" aria-label="Remove the ${name ?? ""} interview${iv.date ? ` on ${iv.date}` : ""}">${icon("x")}</button>` : ""}</li>`;
      })}</ul>
      <div class="iv-actions">${list.length ? html`<button type="button" class="btn btn-ghost btn-sm" data-iv-add>${icon("plus")}Add another interview</button>` : ""}<button type="button" class="btn btn-ghost btn-sm" data-iv-find ${search.finding ? "disabled aria-busy=\"true\"" : ""}>${icon("calendar-search")}${search.finding ? "Looking through your calendar" : "Find interviews in Google Calendar"}</button></div>
      ${fresh().length
        ? html`<ul class="iv-found" aria-label="Interviews found in your Google Calendar">${fresh().map((f, i) => {
            const co = companyIn(f.title, companies);
            return html`<li>${co ? companyLogo(co) : icon("calendar-check")}<span class="iv-found-t"><b>${f.title}</b><span>${when(f)}</span></span><button type="button" class="btn btn-secondary btn-sm" data-iv-take="${i}">Add</button></li>`;
          })}</ul>`
        : ""}
      ${search.note ? html`<p class="text-small text-secondary iv-note" role="status">${search.note}</p>` : ""}`,
    );
  };
  const save = (list: Interview[]): void => {
    o.set(list.filter((i) => i.date));
    paint();
  };
  host.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.matches("[data-iv-time]")) {
      const i = Number(el.dataset.ivTime);
      const list = [...o.get()];
      const cur = list[i];
      if (!cur) return;
      list[i] = { ...cur, time: el.value || null };
      return save(list);
    }
    if (!el.matches("[data-iv-date]")) return;
    const i = Number(el.dataset.ivDate);
    const list = [...o.get()];
    if (!el.value) return save(list.filter((_, j) => j !== i));
    list[i] = { ...list[i], company: list[i]?.company ?? (host.dataset.pending || null), date: el.value };
    delete host.dataset.pending;
    save(list);
  });
  host.addEventListener("click", async (e) => {
    const t = e.target as Element;
    if (t.closest("[data-iv-find]")) return void find();
    const take = t.closest<HTMLElement>("[data-iv-take]");
    if (take) {
      const f = fresh()[Number(take.dataset.ivTake)];
      if (f) save([...o.get(), { date: f.date, time: f.time ?? null, company: companyIn(f.title, companies) }].sort((a, b) => a.date.localeCompare(b.date)));
      return;
    }
    const rm = t.closest<HTMLElement>("[data-iv-remove]");
    if (rm) return save(o.get().filter((_, j) => j !== Number(rm.dataset.ivRemove)));
    if (t.closest("[data-iv-add]")) {
      const last = o.get().at(-1)?.date ?? localDay();
      save([...o.get(), { date: addDays(last, 7), company: null }]);
      return host.querySelector<HTMLInputElement>(`[data-iv-date="${o.get().length - 1}"]`)?.focus();
    }
    const co = t.closest<HTMLElement>("[data-iv-co]");
    if (!co) return;
    const i = Number(co.dataset.ivCo);
    const cur = o.get()[i];
    const slug = await pickCompany(companies, cur?.company ?? null);
    if (slug === undefined) return co.focus();
    // A company picked before a date waits for the date in the row's own state.
    if (!cur) {
      const d = host.querySelector<HTMLInputElement>(`[data-iv-date="${i}"]`)?.value;
      if (d) save([{ date: d, company: slug }]);
      else (host.dataset.pending = slug ?? ""), paint();
      return;
    }
    const list = [...o.get()];
    list[i] = { ...cur, company: slug };
    save(list);
    host.querySelector<HTMLElement>(`[data-iv-co="${i}"]`)?.focus();
  });
  paint();
  // Back from Google's permission screen: search straight away, or say why not. Once per page.
  const back = new URLSearchParams(location.search).get("find-interviews");
  if (back && !returned) {
    returned = true;
    const url = new URL(location.href);
    url.searchParams.delete("find-interviews");
    history.replaceState(null, "", url);
    if (back === "ok") void find();
    else {
      search.note = "Google didn't share your calendar events, so add the interview above";
      dispatchEvent(new Event(SEARCHED));
    }
  }
  return { refresh: paint };
}

