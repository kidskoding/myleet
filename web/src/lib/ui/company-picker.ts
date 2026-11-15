import { companySlug } from "../catalog";
import { companyLogo } from "../company-logos";
import { companySelection, MAX_MOCK_COMPANIES } from "../mock";
import { scoreItem } from "../palette-search";
import type { Playlist } from "../types";
import { html, raw, render } from "./html";
import { closeDialog, openDialog } from "./overlay";

type Company = Pick<Playlist, "id" | "title" | "group">;

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

  function highlight(title: string, ranges: [number, number][]) {
    // Escape each character before adding match markup; overlapping query tokens are safe.
    return raw([...title].map((char, i) => {
      const escaped = html`${char}`.value;
      return ranges.some(([start, end]) => i >= start && i < end) ? `<mark>${escaped}</mark>` : escaped;
    }).join(""));
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
