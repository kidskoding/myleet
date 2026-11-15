// The interviews list: each row a date and an optional company, picked with the company
// search. Used by Settings, onboarding and Change plan; the caller decides where it saves.
import { companySlug, listedCompany } from "../catalog";
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

export function mountInterviews(host: HTMLElement, playlists: Company[], o: InterviewsOpts): { refresh: () => void } {
  const companies = playlists.filter(listedCompany);
  const paint = (): void => {
    const list = o.get();
    const rows = list.length ? list : [{ date: "", company: host.dataset.pending || null }];
    render(
      host,
      html`<ul class="iv-list">${rows.map((iv, i) => {
        const name = companyTitle(companies, iv.company);
        return html`<li class="iv-row"><label class="visually-hidden" for="${o.id}-d${i}">Interview ${i + 1} date</label><input class="input" type="date" id="${o.id}-d${i}" min="${localDay()}" value="${iv.date}" data-iv-date="${i}" />
          <button type="button" class="company-trigger iv-co" data-iv-co="${i}" aria-haspopup="dialog">${iv.company ? html`${companyLogo(iv.company)}<span>${name}</span>` : html`<span class="text-secondary">No specific company</span>`}<span aria-hidden="true">⌕</span></button>
          ${list.length ? html`<button type="button" class="icon-btn" data-iv-remove="${i}" aria-label="Remove the ${name ?? ""} interview${iv.date ? ` on ${iv.date}` : ""}">${icon("x")}</button>` : ""}</li>`;
      })}</ul>
      ${list.length ? html`<button type="button" class="btn btn-ghost btn-sm" data-iv-add>${icon("plus")}Add another interview</button>` : ""}`,
    );
  };
  const save = (list: Interview[]): void => {
    o.set(list.filter((i) => i.date));
    paint();
  };
  host.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (!el.matches("[data-iv-date]")) return;
    const i = Number(el.dataset.ivDate);
    const list = [...o.get()];
    if (!el.value) return save(list.filter((_, j) => j !== i));
    list[i] = { company: list[i]?.company ?? (host.dataset.pending || null), date: el.value };
    delete host.dataset.pending;
    save(list);
  });
  host.addEventListener("click", async (e) => {
    const t = e.target as Element;
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
  return { refresh: paint };
}

