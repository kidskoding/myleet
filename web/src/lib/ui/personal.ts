// Personalization renderers shared by Plan, Today, Skills, the workspace and Progress:
// the reason line, why chips, the session mix bar, forecast rows, the re-plan note,
// insights, trend and confidence, and the post-attempt "What this changes" block.
// Every sentence comes from the core (planner / skill model); these only lay it out.
import { fmtM } from "../schedule";
import type { AttemptFeedback, Forecast, Insight, PlanFixes, PlanItem, PlanNote, PlanTag, Skill, SkillLevel, WhyChip } from "../types";
import { tag, type TagKind } from "./bits";
import { html, raw, type SafeHtml } from "./html";
import { icon, isIcon } from "./icons";
import { markCompanies, type Marks } from "./emphasis";

// ---- reason tags and lines ----

export const TAG_OF: Record<PlanTag, { kind: TagKind; label: string; dot?: boolean }> = {
  review: { kind: "due", label: "Review" },
  weak: { kind: "weak", label: "Weak spot" },
  new: { kind: "new", label: "New topic" },
  progress: { kind: "progress", label: "In progress" },
  sharp: { kind: "sharp", label: "Keep sharp" },
  mock: { kind: "outline", label: "Mock", dot: false },
  check: { kind: "outline", label: "Check-in" },
};

export function reasonTag(t: PlanTag): SafeHtml {
  const o = TAG_OF[t];
  return tag(o.kind, o.label, o.dot === false ? { dot: false } : {});
}

/** Tag + one sentence. The single most important personalization component. */
export function reasonLine(it: Pick<PlanItem, "tag" | "reason">): SafeHtml {
  return html`<span class="reason">${reasonTag(it.tag)}<span>${it.reason}</span></span>`;
}

/** The 12 px reason line under a queue row's sub line. */
export const whyLine = (text: string): SafeHtml => html`<span class="why">${text}</span>`;

/** Up to three "why this one" chips under Today's next-up title. */
export function whyChips(chips: WhyChip[] | undefined, label = "Why this is next"): SafeHtml {
  const list = (chips ?? []).slice(0, 3);
  if (!list.length) return html``;
  return html`<ul class="chips" aria-label="${label}">${list.map(
    (c) => html`<li class="whychip">${isIcon(c.icon) ? icon(c.icon) : ""}${c.text}</li>`,
  )}</ul>`;
}

/** Segments by minutes, coloured like each item's reason tag; always paired with text. */
export function mixBar(items: Pick<PlanItem, "tag" | "minutes">[], opts: { tall?: boolean } = {}): SafeHtml {
  return html`<span class="mix${opts.tall ? " tall" : ""}" aria-hidden="true">${items.map((i) => raw(`<i class="${i.tag}" style="flex:${Math.max(1, i.minutes)}"></i>`))}</span>`;
}

/** Plain text with `**two facts**` in bold. */
export function richText(s: string): SafeHtml {
  return html`${s.split("**").map((part, i) => (i % 2 ? html`<b>${part}</b>` : html`${part}`))}`;
}

export function insightList(list: Insight[]): SafeHtml {
  return html`<ul class="ins">${list.map((i) => html`<li>${isIcon(i.icon) ? icon(i.icon) : icon("circle-help")}<span>${richText(i.text.replace(/\.$/, ""))}</span></li>`)}</ul>`;
}

// ---- forecast ----

export interface ForecastOpts {
  /** `YYYY-MM-DD` the forecast runs to; null = a rolling four weeks. */
  date: string | null;
  fixes?: PlanFixes | null;
  /** Show fix links ("Use 1 h 30 on weekdays"). */
  fix?: boolean;
  /** Shared bar scale; defaults to the largest goal or projection in `rows`. */
  scale?: number;
}

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * One row per target technique. "Behind by N" means short by N problems at the date if
 * you keep to the plan: the one definition used everywhere.
 */
export function forecastRows(rows: Forecast[], o: ForecastOpts): SafeHtml {
  const scale = o.scale ?? Math.max(1, ...rows.map((r) => Math.max(r.goal, r.projected))) * 1.12;
  const when = o.date ? `by ${shortDate(o.date)}` : "in 4 weeks";
  const pct = (n: number) => `${((Math.max(0, n) / scale) * 100).toFixed(1)}%`;
  return html`${rows.map((f) => {
    const mastered = Math.min(f.mastered_now ?? 0, f.started_now);
    const climbing = f.started_now - mastered;
    const added = Math.max(0, f.projected - f.started_now);
    const behind = f.behind_by > 0;
    const fx = o.fixes?.techniques.find((t) => t.module === f.module && t.technique === f.technique);
    const fixLink = !behind || !o.fix || !o.fixes
      ? ""
      : fx?.weekday_minutes
        ? html`<button type="button" class="fix" data-fix="${fx.weekday_minutes}">Use ${fmtM(fx.weekday_minutes)} on weekdays</button>`
        : html`<span>Not reachable at up to 2 h on weekdays</span>`;
    return html`<div class="fc-row${behind ? " is-behind" : ""}">
      <span class="nm">${f.title}${f.companies.length ? html`<small>${f.companies.slice(0, 2).join(", ")}</small>` : ""}</span>
      <div class="fc-bar" role="img" aria-label="${f.title}: ${f.started_now} started now, ${f.projected} ${when}, ${f.goal} needed"><span class="m" style="width:${pct(mastered)}"></span><span class="c" style="width:${pct(climbing)}"></span><span class="p" style="width:${pct(added)}"></span><i class="need" style="left:${pct(f.goal)}"></i></div>
      ${behind ? html`<span class="pace-st behind">${icon("trending-down")}Behind by ${f.behind_by}</span>` : html`<span class="pace-st">${icon("circle-check")}On track</span>`}
      ${behind ? html`<span class="detail"><span>${f.projected} of ${f.goal} ${when}</span>${fixLink}</span>` : ""}
    </div>`;
  })}`;
}

export const forecastKey = (): SafeHtml =>
  html`<div class="fc-key" aria-hidden="true"><span><i class="m"></i>Mastered</span><span><i class="c"></i>Leveling up</span><span><i class="p"></i>Added by the plan</span><span><i class="need"></i>Needed</span></div>`;

// ---- re-plan note ----

const NOTE_ICON: Record<string, Parameters<typeof icon>[0]> = {
  missed: "calendar-clock",
  away: "calendar-clock",
  great_day: "circle-check",
  over_budget: "scale",
  cram: "flag",
  date_passed: "calendar-days",
  backlog: "layers",
  offline: "wifi-off",
  no_date: "calendar-days",
};

/** Calm by design: ink on sunk, never amber, red or a toast. At most one at a time. */
export function replanNote(n: Pick<PlanNote, "kind" | "title" | "body"> & { actions?: PlanNote["actions"] }, opts: { dismiss?: boolean; link?: SafeHtml; marks?: Marks } = {}): SafeHtml {
  const m = opts.marks ?? {};
  return html`<div class="replan" role="status" data-note="${n.kind}">
    ${icon(NOTE_ICON[n.kind] ?? "calendar-clock")}
    <div><strong>${markCompanies(n.title, m)}</strong> ${markCompanies(n.body, m)}${opts.link ? html` ${opts.link}` : ""}</div>
    <div class="acts">${(n.actions ?? []).map(
      (a, i) =>
        html`<button type="button" class="btn ${i === 0 ? "btn-secondary" : "btn-ghost"} btn-sm" data-note-act="${a.kind}"${a.value !== undefined ? raw(` data-value="${a.value}"`) : ""}>${a.label}</button>`,
    )}${opts.dismiss ? html`<button type="button" class="icon-btn x" data-note-dismiss aria-label="Dismiss">${icon("x")}</button>` : ""}</div>
  </div>`;
}

/** Notes are dismissed per event: the same title never comes back. */
export function noteDismissed(n: Pick<PlanNote, "kind" | "title">): boolean {
  try {
    return localStorage.getItem(`myleet:note:${n.kind}:${n.title}`) !== null;
  } catch {
    return false;
  }
}

export function dismissNote(n: Pick<PlanNote, "kind" | "title">): void {
  try {
    localStorage.setItem(`myleet:note:${n.kind}:${n.title}`, String(Date.now()));
  } catch {
    // Shows again next visit.
  }
}

// ---- skills: level, trend, confidence ----

export const LEVELS: SkillLevel[] = ["new", "shaky", "building", "solid", "strong"];
export const LEVEL_WORD: Record<SkillLevel, string> = { new: "New", shaky: "Shaky", building: "Building", solid: "Solid", strong: "Strong" };
export const levelIndex = (l: SkillLevel): number => LEVELS.indexOf(l);

export function trend(t: Skill["trend"], recent = 4): SafeHtml {
  if (t === "improving") return html`<span class="trend">${icon("trending-up")}Improving</span>`;
  if (t === "slipping") return html`<span class="trend down">${icon("trending-down")}Slipping</span>`;
  if (t === "flat") return html`<span class="trend">${icon("minus")}Steady</span>`;
  return recent > 0 ? html`<span class="trend">${icon("circle-help")}Too early to tell</span>` : html``;
}

const SURE_WORD: Record<Skill["sureness"], string> = { none: "No attempts", first_read: "First read", fairly_sure: "Fairly sure", sure: "Sure" };
const SURE_BARS: Record<Skill["sureness"], number> = { none: 0, first_read: 1, fairly_sure: 2, sure: 3 };

/** Three bars plus words; the count is always visible. */
export function confidence(s: Pick<Skill, "sureness" | "recent">): SafeHtml {
  return html`<span class="conf" data-c="${SURE_BARS[s.sureness]}"><i aria-hidden="true"><b></b><b></b><b></b></i>${SURE_WORD[s.sureness]}: ${s.recent} ${s.recent === 1 ? "attempt" : "attempts"}</span>`;
}

const lvlVar = (l: SkillLevel) => `var(--lvl-${levelIndex(l)})`;

// ---- post-attempt: "What this changes" ----

/**
 * The diagnosis update in the result sheet: the core's sentence, the level shift (or "No
 * change for this topic") and the trend. `role="status"` so it is announced once.
 */
export function whatThisChanges(fb: AttemptFeedback, opts: { href?: string } = {}): SafeHtml {
  const moved = fb.after !== fb.before;
  return html`<div class="upd" role="status">
    <h3>${icon("crosshair")}What this changes</h3>
    <p>${fb.text}</p>
    <div class="shift">
      ${moved ? html`<span class="lv lv-from" style="--lvl:${raw(lvlVar(fb.before))}">${LEVEL_WORD[fb.before]}</span>${icon("arrow-right")}` : ""}
      <span class="lv${moved ? " lv-to" : ""}" style="--lvl:${raw(lvlVar(fb.after))}">${LEVEL_WORD[fb.after]}</span>
      ${moved ? "" : html`<span class="text-muted">No change for this topic</span>`}
      <span class="shift-end">${trend(fb.trend, 1)}${opts.href ? html`<a class="link text-small" href="${opts.href}">See ${fb.technique_title}</a>` : ""}</span>
    </div>
  </div>`;
}

/** "Target 25 min. You usually take 19." for the workspace bar. */
export function yourPace(targetMin: number, usualMin: number | null): SafeHtml {
  return usualMin
    ? html`<span class="yourpace">Target <b>${targetMin} min</b>. You usually take <b>${usualMin}</b></span>`
    : html`<span class="yourpace">Target <b>${targetMin} min</b></span>`;
}
