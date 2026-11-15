// "I was asked this": community interview reports on the problem pane. Counts are public;
// adding or removing a report needs an account (worker/src/reports.rs).
import { companySlug, loadCatalog } from "../../lib/catalog";
import { companyLogo } from "../../lib/company-logos";
import { scoreItem } from "../../lib/palette-search";
import { countLines, fetchReports, recentMonths, setReport, type Reports } from "../../lib/reports";
import { ROUTES } from "../../lib/routes";
import type { Playlist } from "../../lib/types";
import { icon } from "./icons";
import { $, h, popover, toast } from "./ui";

const MAX_RESULTS = 8;

export function mountAsked(root: HTMLElement): void {
  const box = root.querySelector<HTMLElement>("[data-asked]");
  const problem = root.dataset["problem"];
  if (!box || !problem || box.hidden) return;
  const list = $(box, "[data-asked-counts]");
  const empty = $(box, "[data-asked-empty]");
  const open = $<HTMLButtonElement>(box, "[data-asked-open]");
  const signin = $(box, "[data-asked-signin]");
  const signedIn = document.documentElement.dataset["auth"] === "in";
  open.hidden = !signedIn;
  signin.hidden = signedIn;
  $<HTMLAnchorElement>(signin, "a").href = `${ROUTES.signin}?next=${encodeURIComponent(location.pathname)}`;

  let companies: Pick<Playlist, "id" | "title" | "group">[] = [];
  let state: Reports = { counts: [], mine: [] };

  const paint = () => {
    const lines = countLines(state.counts, companies);
    list.replaceChildren(...lines.map((l) => h("li", { html: companyLogo(l.company).value }, l.text)));
    empty.hidden = lines.length > 0;
    const n = state.mine.length;
    open.setAttribute("aria-label", n ? `I was asked this, ${n} reported by you` : "I was asked this");
  };

  void Promise.all([loadCatalog(), fetchReports(problem)])
    .then(([c, r]) => {
      companies = c.catalog.playlists;
      state = r;
      paint();
    })
    // No Worker (preview, offline): keep the quiet empty line.
    .catch(() => {});

  open.addEventListener("click", () => {
    const month = h(
      "select",
      { "aria-label": "Interview month, optional" },
      h("option", { value: "" }, "Month, if you remember"),
      ...recentMonths(new Date()).map((m) => h("option", { value: m.value }, m.label)),
    ) as HTMLSelectElement;
    const search = h("input", {
      type: "search", placeholder: "Search companies", "aria-label": "Search companies", role: "combobox",
      "aria-expanded": "true", "aria-controls": "wsx-asked-list", "aria-autocomplete": "list", autocomplete: "off", spellcheck: "false",
    }) as HTMLInputElement;
    const results = h("ul", { class: "asked-results", id: "wsx-asked-list", role: "listbox", "aria-label": "Companies" });
    let shown: typeof companies = [];
    let active = 0;
    let busy = false;
    const mine = (slug: string) => state.mine.some((m) => m.company === slug);

    const draw = () => {
      const q = search.value.trim();
      const hits = companies.flatMap((c) => {
        const hit = scoreItem(q, { key: c.id, kind: "company", title: c.title, hint: c.group });
        return hit ? [{ c, score: hit.score }] : [];
      });
      if (q) hits.sort((a, b) => b.score - a.score);
      // With no query, the learner's own reports come first so they are easy to undo.
      else hits.sort((a, b) => Number(mine(companySlug(b.c.id))) - Number(mine(companySlug(a.c.id))));
      shown = hits.slice(0, MAX_RESULTS).map((x) => x.c);
      active = Math.min(active, Math.max(0, shown.length - 1));
      results.replaceChildren(
        ...(shown.length
          ? shown.map((c, i) => {
              const slug = companySlug(c.id);
              const li = h(
                "li",
                { role: "option", id: `wsx-asked-${i}`, "aria-selected": String(mine(slug)), "data-active": String(i === active) },
                h("span", { class: "co", html: companyLogo(slug).value }, c.title),
                mine(slug) ? h("span", { class: "mark", html: icon("check", 14, "icon-sm"), "aria-hidden": "true" }) : null,
              );
              li.addEventListener("click", () => void choose(i));
              return li;
            })
          : [h("li", { class: "asked-none" }, `No companies match "${q}"`)]),
      );
      if (shown.length) search.setAttribute("aria-activedescendant", `wsx-asked-${active}`);
      else search.removeAttribute("aria-activedescendant");
      document.getElementById(`wsx-asked-${active}`)?.scrollIntoView({ block: "nearest" });
    };

    const choose = async (i: number) => {
      const c = shown[i];
      if (!c || busy) return;
      const slug = companySlug(c.id);
      const reported = !mine(slug);
      busy = true;
      try {
        state = await setReport({ problem, company: slug, season: month.value || null, reported });
        paint();
        draw();
        toast($(root, "[data-toast]"), reported ? `Thanks. Your ${c.title} report is saved` : `Removed your ${c.title} report`);
      } catch {
        toast($(root, "[data-toast]"), "Could not save that. Try again in a moment");
      } finally {
        busy = false;
      }
    };

    search.addEventListener("input", () => ((active = 0), draw()));
    search.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (shown.length) active = (active + (e.key === "ArrowDown" ? 1 : shown.length - 1)) % shown.length;
        draw();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void choose(active);
      }
    });

    const el = h(
      "div",
      { class: "asked-pop", role: "dialog", "aria-labelledby": "wsx-asked-h" },
      h("h3", { id: "wsx-asked-h" }, "Where were you asked this?"),
      month,
      search,
      results,
      h("p", { class: "note" }, "Pick a company to add it, and pick it again to remove it. Nobody sees who reported, and a count shows only once 3 people report the same company"),
    );
    draw();
    popover(root, open, el, { focus: search });
  });

  paint();
}
