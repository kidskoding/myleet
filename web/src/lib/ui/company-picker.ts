import { companySlug } from "../catalog";
import { companyLogo } from "../company-logos";
import { companySelection, MAX_MOCK_COMPANIES } from "../mock";
import { scoreItem } from "../palette-search";
import type { Playlist } from "../types";
import { html, raw, render, type SafeHtml } from "./html";
import { closeDialog, openDialog } from "./overlay";

type Company = Pick<Playlist, "id" | "title" | "group">;

function highlight(title: string, ranges: [number, number][]): SafeHtml {
  // Escape each character before adding match markup; overlapping query tokens are safe.
  return raw([...title].map((char, i) => {
    const escaped = html`${char}`.value;
    return ranges.some(([start, end]) => i >= start && i < end) ? `<mark>${escaped}</mark>` : escaped;
  }).join(""));
}

/**
 * The same company search as the mock page, choosing one company or "No specific company".
 * Resolves the playlist slug, null for no company, or undefined when dismissed.
 */
export function pickCompany(companies: Company[], current: string | null): Promise<string | null | undefined> {
  const dialog = document.createElement("dialog");
  dialog.className = "dlg company-picker-dialog";
  dialog.setAttribute("aria-labelledby", "pick-company-title");
  render(dialog, html`<div class="dlg-head"><h2 id="pick-company-title">Which company is it with?</h2><button class="icon-btn" type="button" data-close aria-label="Close">×</button></div>
    <div class="company-search"><input class="input" type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="pick-company-results" aria-label="Search companies" placeholder="Search companies" autocomplete="off" /></div>
    <div class="company-results" id="pick-company-results" role="listbox" aria-label="Companies"></div>`);
  document.body.append(dialog);
  const search = dialog.querySelector("input") as HTMLInputElement;
  const results = dialog.querySelector(".company-results") as HTMLElement;
  let options: (Company | null)[] = [];
  let active = 0;
  let picked: string | null | undefined;

  const focusOption = (): void => {
    results.querySelectorAll<HTMLElement>("[data-option]").forEach((el, i) => { el.dataset.active = String(i === active); });
    const el = results.querySelector<HTMLElement>(`[data-option="${active}"]`);
    if (el) { search.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
  };
  const paint = (): void => {
    const q = search.value.trim();
    const hits = companies.flatMap((company) => {
      const hit = scoreItem(q, { key: company.id, kind: "company", title: company.title, hint: company.group });
      return hit ? [{ company, ranges: hit.ranges, score: hit.score }] : [];
    });
    if (q) hits.sort((a, b) => b.score - a.score);
    options = [...(q ? [] : [null]), ...hits.map((h) => h.company)];
    active = Math.min(active, Math.max(0, options.length - 1));
    const row = (c: Company | null, i: number, name: SafeHtml) => {
      const on = (c ? companySlug(c.id) : null) === current;
      return html`<button type="button" class="company-result" role="option" id="pick-company-${i}" data-option="${i}" aria-selected="${String(on)}" tabindex="-1">${c ? companyLogo(companySlug(c.id)) : ""}<span class="company-name"><span>${name}</span></span>${on ? html`<span aria-label="Selected">✓</span>` : ""}</button>`;
    };
    render(results, options.length ? html`${options.map((c, i) => (c ? row(c, i, highlight(c.title, hits.find((h) => h.company === c)?.ranges ?? [])) : row(null, i, html`No specific company`)))}` : html`<p class="company-picker-empty">No companies match "${q}"</p>`);
    focusOption();
  };
  const choose = (i: number): void => {
    if (i >= options.length) return;
    const c = options[i];
    picked = c ? companySlug(c.id) : null;
    closeDialog(dialog);
  };
  search.addEventListener("input", () => { active = 0; paint(); });
  results.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-option]");
    if (el) choose(Number(el.dataset.option));
  });
  dialog.querySelector("[data-close]")?.addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); return closeDialog(dialog); }
    if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowDown" && options.length) active = (active + 1) % options.length;
    if (e.key === "ArrowUp" && options.length) active = (active - 1 + options.length) % options.length;
    if (e.key === "Enter") return choose(active);
    focusOption();
  });
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => { dialog.remove(); resolve(picked); }, { once: true });
    openDialog(dialog);
    paint();
    search.focus();
  });
}

export function mountCompanyPicker(onChange: () => void): void {
  const host = document.querySelector<HTMLElement>("[data-company-picker]");
  const dialog = document.querySelector<HTMLDialogElement>("[data-company-dialog]");
  const search = dialog?.querySelector<HTMLInputElement>("[data-company-search]");
  const results = dialog?.querySelector<HTMLElement>("[data-company-results]");
  const value = host?.querySelector<HTMLInputElement>("[data-company]");
  const selected = host?.querySelector<HTMLElement>("[data-company-selected]");
  const trigger = host?.querySelector<HTMLButtonElement>("[data-company-open]");
  const data = document.querySelector("[data-picker-companies]");
  if (!host || !dialog || !search || !results || !value || !selected || !trigger || !data || host.dataset.bound) return;
  host.dataset.bound = "true";
  const companies = JSON.parse(data.textContent ?? "[]") as Company[];
  let matches: { company: Company; ranges: [number, number][]; score: number }[] = [];
  let active = 0;

  function caption(): void {
    const ids = companySelection(value!.value);
    const picked = companies.filter((c) => ids.includes(c.id));
    render(selected!, picked.length ? html`${picked.map((company) => html`<span class="company-picked">${companyLogo(companySlug(company.id))}${company.title}</span>`)}` : html`Choose companies`);
  }

  function focusOption(): void {
    results!.querySelectorAll<HTMLElement>("[data-option]").forEach((el, i) => { el.dataset.active = String(i === active); });
    const option = results!.querySelector<HTMLElement>(`[data-option="${active}"]`);
    if (option) {
      search!.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    } else search!.removeAttribute("aria-activedescendant");
  }

  function paint(): void {
    const query = search!.value.trim();
    matches = companies.flatMap((company) => {
      const hit = scoreItem(query, { key: company.id, kind: "company", title: company.title, hint: company.group });
      return hit ? [{ company, ranges: hit.ranges, score: hit.score }] : [];
    });
    if (query) matches.sort((a, b) => b.score - a.score);
    active = Math.min(active, Math.max(0, matches.length - 1));
    const ids = companySelection(value!.value);
    const full = ids.length >= MAX_MOCK_COMPANIES;
    render(results!, matches.length ? html`${matches.map(({ company, ranges }, i) => html`
      <button type="button" class="company-result" role="option" id="company-result-${i}" data-option="${i}" data-active="${i === active}" aria-selected="${String(ids.includes(company.id))}" aria-disabled="${String(full && !ids.includes(company.id))}" tabindex="-1">
        ${companyLogo(companySlug(company.id))}<span class="company-name"><span>${highlight(company.title, ranges)}</span></span>${ids.includes(company.id) ? html`<span aria-label="Selected">✓</span>` : ""}
      </button>` )}` : html`<p class="company-picker-empty">No companies match "${query}"</p>`);
    const count = dialog!.querySelector("[data-company-count]");
    if (count) count.textContent = `${ids.length} of ${MAX_MOCK_COMPANIES} selected${full ? " · Deselect one to choose another" : ""}`;
    focusOption();
  }

  function choose(index: number): void {
    const company = matches[index]?.company;
    if (!company) return;
    const ids = companySelection(value!.value);
    if (!ids.includes(company.id) && ids.length >= MAX_MOCK_COMPANIES) return;
    value!.value = JSON.stringify(ids.includes(company.id) ? ids.filter((id) => id !== company.id) : [...ids, company.id]);
    const radio = host!.querySelector<HTMLInputElement>('input[name="src"]');
    if (radio) radio.checked = true;
    caption();
    value!.dispatchEvent(new Event("change", { bubbles: true }));
    onChange();
    paint();
    search!.focus();
  }

  caption();
  trigger.addEventListener("click", () => {
    search.value = "";
    openDialog(dialog);
    paint();
    search.focus();
  });
  dialog.querySelector("[data-company-close]")?.addEventListener("click", () => closeDialog(dialog));
  search.addEventListener("input", () => { active = 0; paint(); });
  dialog.querySelector("[data-company-done]")?.addEventListener("click", () => closeDialog(dialog));
  results.addEventListener("click", (event) => {
    const option = (event.target as Element).closest<HTMLElement>("[data-option]");
    if (option) choose(Number(option.dataset.option));
  });
  results.addEventListener("pointermove", (event) => {
    const option = (event.target as Element).closest<HTMLElement>("[data-option]");
    if (option) { active = Number(option.dataset.option); focusOption(); }
  });
  dialog.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); closeDialog(dialog); return; }
    if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowDown" && matches.length) active = (active + 1) % matches.length;
    if (event.key === "ArrowUp" && matches.length) active = (active - 1 + matches.length) % matches.length;
    if (event.key === "Enter") return choose(active);
    focusOption();
  });
}
