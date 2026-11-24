import { For, Show, type JSX } from "solid-js";
import { requireAccount } from "../../lib/access";
import { cachedMe } from "../../lib/account";
import { attempts, parseEvents } from "../../lib/attempts";
import { companyLogo } from "../../lib/company-logos";
import { topicName } from "../../lib/goals";
import { forecastLead, headCopy, INSIGHTS_EMPTY, onTrackLine, paceLine, progressLine } from "../../lib/plan-copy";
import { readLedger, standing } from "../../lib/plan-progress";
import { readPrefs } from "../../lib/prefs";
import { ROUTES } from "../../lib/routes";
import { clock, dateOf, DAY_SHORT, fmtM, isoDay, minuteOf, span, weekdayIndex } from "../../lib/schedule";
import type { Interview, PlanDay } from "../../lib/types";
import { kbd, plural } from "../../lib/ui/bits";
import { openCalendarSync } from "../../lib/ui/calendar-sync";
import { companyMarks, emphasize, markCompanies, type Marks } from "../../lib/ui/emphasis";
import { editGoalsLabel } from "../../lib/ui/goals-editor";
import { icon } from "../../lib/ui/icons";
import { companyTitle } from "../../lib/ui/interviews";
import { forecastKey, forecastRows, insightList, mixBar, replanNote } from "../../lib/ui/personal";
import { prepChecklist } from "../../lib/ui/prep-checklist";
import {
  busyOn,
  companySlugNow,
  currentNote,
  dayDiff,
  dayHeadline,
  doneSittings,
  FORECAST_ROWS,
  hasCheckpoint,
  interviewsOn,
  isMock,
  longDay,
  roadOf,
  short,
  startHref,
  STATUS_TEXT,
  STICKY_NOTES,
  withHabit,
  type Ctx,
  type Milestone,
} from "./model";
import { raw } from "./raw";
import type { PlanState } from "./state";

/** Logos for the learner's target and interview companies, for the copy that names them. */
export function marks(c: Ctx): Marks {
  const p = readPrefs().plan;
  return companyMarks(c.cat.catalog.playlists, [...p.companies, ...p.interviews.map((i) => i.company)]);
}

const company = (c: Ctx): string | null => companyTitle(c.cat.catalog.playlists, companySlugNow());
const logo = (iv: Interview | undefined) => raw(iv?.company ? companyLogo(iv.company) : icon("flag"));

export function openSync(s: PlanState): void {
  if (!requireAccount("calendar-sync")) return;
  const c = s.ctx();
  void openCalendarSync(() => {
    if (!c) return null;
    const next = c.plan.days.find((d) => d.sessions.length);
    if (!next) return null;
    const one = { ...c.plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] };
    return c.t.planIcs(one, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes });
  });
}

/** Before an interview with a company: its topics as a checklist, ready now or by when. */
function prepGoal(c: Ctx): string {
  const named = (slugs: string[]) => slugs.map((slug) => ({ slug, name: companyTitle(c.cat.catalog.playlists, slug) ?? slug }));
  const pc = c.plan.prep;
  if (pc?.topics.length) {
    const slug = (c.plan.interviews ?? []).find((i) => i.date === pc.date)?.company;
    return String(prepChecklist(pc, slug ? named([slug]) : []));
  }
  const dream = c.plan.dream;
  if (!dream?.topics.length) return "";
  const p = readPrefs().plan;
  const slugs = [...new Set([...p.interviews.filter((i) => i.company && i.date >= c.plan.start).map((i) => i.company as string), ...p.companies])];
  return String(prepChecklist(dream, named(slugs), true));
}

function firstName(): string | null {
  const n = cachedMe()?.user.display_name?.trim();
  return n ? (n.split(/\s+/)[0] ?? null) : null;
}

export function Head(p: { s: PlanState; c: Ctx }) {
  const c = p.c;
  const pr = readPrefs().plan;
  const goal = prepGoal(c);
  const date = c.plan.interview_date;
  const later = (c.plan.interviews ?? []).find((i) => date && i.date > date);
  // Interview companies are targets too (the planner adds them), so an interview today with
  // no date after it still names its company in the title.
  const ivCos = pr.interviews.filter((i) => i.company && i.date >= c.plan.start).map((i) => i.company as string);
  const companies = [...new Set([...ivCos, ...pr.companies])].flatMap((x) => companyTitle(c.cat.catalog.playlists, x) ?? []);
  const topics = pr.focusTopics.flatMap((t) => topicName(c.cat.catalog, t) ?? []);
  const m = marks(c);
  const copy = headCopy({
    plan: c.plan,
    company: company(c),
    companies,
    topics,
    name: firstName(),
    windows: pr.availability,
    weekday: pr.dailyMinutes ?? undefined,
    weekend: pr.weekendMinutes ?? pr.dailyMinutes ?? undefined,
    today: c.plan.start,
    nextAfter: later ? { company: later.name ?? null, date: later.date } : null,
  });
  // startedAt is per device; the synced ledger's first day keeps "Day N" right on a new one.
  const first = [pr.startedAt, Object.keys(readLedger()).sort()[0]].filter((d): d is string => !!d && d <= c.plan.start).sort()[0];
  const prog = date ? progressLine(first ?? c.plan.start, date, c.plan.start) : null;
  // During interview prep the checklist card says whether you'll be ready; a pace line would contradict it.
  const track = c.plan.prep?.topics.length ? null : onTrackLine(standing(c.plan, c.events, c.now), date, company(c));
  return (
    <>
      <a class="back" href={ROUTES.today}>
        {raw(icon("arrow-left"))}Today
      </a>
      <header class="plan-head" classList={{ "has-goal": !!goal }}>
        <div class="ph-copy">
          <h1>{raw(markCompanies(copy.title, m))}</h1>
          <p class="lede">{raw(emphasize(copy.lede, companies, m))}</p>
          <Show when={prog}>
            {(pg) => (
              <div class="plan-progress">
                <span class="pp-text">{pg().text}</span>
                <span class="pp-bar" role="progressbar" aria-label="Plan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pg().share * 100)}>
                  <span style={{ width: `${(pg().share * 100).toFixed(1)}%` }} />
                </span>
              </div>
            )}
          </Show>
          <Show when={track}>{(t) => <p class="on-track">{raw(markCompanies(t(), m))}</p>}</Show>
        </div>
        <div class="head-actions">
          <button type="button" class="btn btn-secondary" data-act="change" onClick={() => p.s.setChange({})}>
            {raw(editGoalsLabel())}
          </button>
          <button type="button" class="btn btn-secondary" data-act="avail" aria-keyshortcuts="a" onClick={() => p.s.openDrawer()}>
            {raw(icon("clock-3"))}Edit availability {raw(kbd("a"))}
          </button>
          <button type="button" class="btn btn-secondary when-out" data-act="save" onClick={() => void requireAccount("save-plan")}>
            {raw(icon("calendar-check"))}Save plan
          </button>
          <button type="button" class="btn btn-secondary" data-act="sync" aria-keyshortcuts="c" onClick={() => openSync(p.s)}>
            {raw(icon("calendar-plus"))}Add to calendar
          </button>
        </div>
        {goal ? raw(goal) : null}
      </header>
    </>
  );
}

export function Note(p: { c: Ctx }) {
  const note = currentNote(p.c);
  return note ? raw(replanNote(note, { marks: marks(p.c), dismiss: !STICKY_NOTES.has(note.kind) })) : null;
}

export function Toolbar(p: { s: PlanState }) {
  const s = p.s;
  const range = () => {
    const c = s.ctx();
    if (!c) return "";
    const days = s.grid()?.days ?? [];
    const first = days[0]?.date ?? c.plan.start;
    const last = days.at(-1)?.date ?? first;
    if (s.view() === "roadmap") return `${short(c.plan.start)} to ${short(c.plan.interview_date ?? c.plan.days.at(-1)?.date ?? c.plan.start)}`;
    if (s.view() === "month") {
      const a = dateOf(c.plan.start);
      a.setDate(a.getDate() - ((a.getDay() + 6) % 7));
      const e = new Date(a);
      e.setDate(a.getDate() + 34);
      return `${short(isoDay(a))} to ${short(isoDay(e))}`;
    }
    return dateOf(first).getMonth() === dateOf(last).getMonth() ? `${short(first)} to ${dateOf(last).getDate()}` : `${short(first)} to ${short(last)}`;
  };
  // Prefs change re-plans, so reading them off the plan keeps this current.
  const budget = () => {
    s.plan();
    const pr = readPrefs().plan;
    const wd = pr.dailyMinutes ?? 60;
    return { wd, we: pr.weekendMinutes ?? wd };
  };
  const unit = () => (s.cols() === 7 ? "week" : "4 days");
  const seg = (v: "week" | "month" | "roadmap", label: () => string) => (
    <button type="button" aria-pressed={s.view() === v} onClick={() => s.setView(v)}>
      {label()}
    </button>
  );
  return (
    <>
      <div class="cal-bar">
        <div class="nav2">
          <button type="button" class="icon-btn" aria-label={`Previous ${unit()} ( [ )`} disabled={s.offset() === 0 || s.view() !== "week"} onClick={() => s.nav(-1)}>
            {raw(icon("chevron-left"))}
          </button>
          <button type="button" class="icon-btn" aria-label={`Next ${unit()} ( ] )`} disabled={s.offset() + s.cols() >= s.days().length || s.view() !== "week"} onClick={() => s.nav(1)}>
            {raw(icon("chevron-right"))}
          </button>
        </div>
        <button type="button" class="btn btn-secondary btn-sm todaybtn" aria-keyshortcuts="t" onClick={() => s.goTo(0)}>
          Today {raw(kbd("t"))}
        </button>
        <h2 id="cal-h">{range()}</h2>
        <button type="button" class="budget-chip" aria-label={`Daily time: ${fmtM(budget().wd)} on weekdays, ${fmtM(budget().we)} on weekends. Edit goals`} onClick={() => s.setChange({})}>
          {raw(icon("clock-3"))}
          <span>{fmtM(budget().wd)} weekdays</span>
          <span class="sep" aria-hidden="true">·</span>
          <span>{fmtM(budget().we)} weekends</span>
        </button>
        <div class="seg" role="group" aria-label="View" style={{ "--on": String(s.view() === "week" ? 1 : s.view() === "month" ? 2 : 3) }}>
          <span class="seg-thumb" aria-hidden="true" ref={(el) => (s.refs.thumb = el)} />
          {seg("week", () => (s.cols() === 7 ? "Week" : "4 days"))}
          {seg("month", () => "Month")}
          {seg("roadmap", () => "Roadmap")}
        </div>
      </div>
      <Show when={s.view() === "week"}>
        <p class="cal-hint">
          Drag a session to move it, or focus one and press {raw(kbd("Space"))}. Use a day's {raw(icon("ellipsis"))} menu to take that day off
        </p>
      </Show>
      <p id="plan-live" class="live" role="status" aria-live="polite">
        <Show when={s.live()}>
          {(l) => (
            <>
              <strong>Updated</strong> {l().label}. {l().line}
            </>
          )}
        </Show>
      </p>
    </>
  );
}

const flag = (iv: Interview) => (
  <span class="chip interview">
    {logo(iv)}
    <span>{iv.name ?? "Interview"}</span>
  </span>
);

export function Month(p: { s: PlanState; c: Ctx; whole: boolean }) {
  const c = p.c;
  const start = dateOf(c.plan.start);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const finish = [c.plan.days.at(-1)?.date ?? c.plan.start, c.plan.interview_date ?? "", ...(c.plan.interviews ?? []).map((i) => i.date)].sort().at(-1) ?? c.plan.start;
  const count = p.whole ? Math.ceil((dateOf(finish).getTime() - start.getTime()) / 86400000 / 7 + 1 / 7) * 7 : 35;
  const byDate = new Map(c.plan.days.map((d, i) => [d.date, [d, i] as const]));
  const practised = new Set(
    attempts(parseEvents(c.events))
      .filter((a) => a.end)
      .map((a) => isoDay(new Date(a.end ?? 0))),
  );
  const past = new Map(standing(c.plan, c.events, c.now).days.map((d) => [d.date, d.status]));
  const cells: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const day = isoDay(dt);
    const hit = byDate.get(day);
    const ivs = interviewsOn(c.plan, day);
    if (!hit) {
      const st = day < c.plan.start ? past.get(day) : undefined;
      cells.push(
        ivs.length ? (
          <div class="mc" aria-label={`${longDay(day)}: ${ivs.map((x) => `${x.name ?? "your"} interview`).join(", ")}`}>
            <span class="num">
              <span>{dt.getDate()}</span>
            </span>
            {ivs.map(flag)}
          </div>
        ) : st ? (
          <div class={`mc out st-${st}`} aria-label={`${longDay(day)}: ${STATUS_TEXT[st].toLowerCase()}`}>
            <span class="num">
              <span>{dt.getDate()}</span>
            </span>
            <span class="st">{STATUS_TEXT[st]}</span>
          </div>
        ) : (
          <div class="mc out">
            <span class="num">
              <span>{dt.getDate()}</span>
              {day < c.plan.start && practised.has(day) ? <small>done</small> : null}
            </span>
          </div>
        ),
      );
      continue;
    }
    const [d, idx] = hit;
    const what = dayHeadline(d);
    cells.push(
      <button type="button" class="mc" classList={{ today: day === c.plan.start }} aria-label={`${longDay(day)}: ${d.off ? "day off" : d.minutes ? `${fmtM(d.minutes)}, ${what}` : "nothing planned"}`} onClick={() => p.s.openDayPop(idx)}>
        <span class="num">
          <span>{p.whole && (i === 0 || dt.getDate() === 1) ? short(day) : dt.getDate()}</span>
          {d.minutes ? <small>{d.minutes}m</small> : null}
        </span>
        {d.off ? (
          <span class="chip off">Day off</span>
        ) : (
          <>
            {what ? <span class="what">{what}</span> : null}
            {p.whole && d.minutes ? raw(mixBar(d.sessions.flatMap((x) => x.items))) : null}
            {d.sessions.some(isMock) ? <span class="chip mock on-wall">Mock</span> : null}
            {d.sessions.some(hasCheckpoint) ? <span class="chip check">Check-in</span> : null}
          </>
        )}
        {ivs.map(flag)}
      </button>,
    );
  }
  return (
    <>
      <Show when={p.whole}>
        <p class="roadmap-sum">{c.plan.summary.headline.replace(/\.$/, "")}</p>
      </Show>
      <div class="panel month" classList={{ roadmap: p.whole }}>
        {DAY_SHORT.map((d) => (
          <div class="mh">{d}</div>
        ))}
        {cells}
      </div>
    </>
  );
}

export function Agenda(p: { s: PlanState; c: Ctx }) {
  const c = p.c;
  const days = () => p.s.days().slice(p.s.offset(), p.s.offset() + 7);
  const done = () => (days().some((d) => d.date === c.plan.start) ? doneSittings(c) : []);
  const past = new Map(standing(c.plan, c.events, c.now).days.map((d) => [d.date, d]));
  const day = (d: PlanDay) => {
    const isToday = d.date === c.plan.start;
    const before = d.date < c.plan.start;
    const was = before ? past.get(d.date) : undefined;
    const head = `${isToday ? "Today, " : ""}${DAY_SHORT[weekdayIndex(d.date)]} ${dateOf(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const busy = busyOn(d.date);
    const body = (): JSX.Element => {
      if (before) return <div class="ag-empty">{was ? STATUS_TEXT[was.status] : "Nothing recorded"}</div>;
      if (d.off) return <div class="ag-off">Day off. Its work moved to the next free windows</div>;
      return (
        <>
          {isToday
            ? done().map((x) => (
                <div class="ag-ses done">
                  <span class="t">{clock(x.start)}</span>
                  <div>
                    <div class="h">Done: {x.clean ? plural(x.clean, "clean pass", "clean passes") : `${x.solved} solved`}</div>
                  </div>
                </div>
              ))
            : null}
          {d.sessions.length ? (
            d.sessions.map((ses, j) => (
              <>
                {busy
                  .filter((b) => b.start < minuteOf(ses.start_ms) && b.start >= (j ? minuteOf(d.sessions[j - 1]?.start_ms ?? 0) : 0))
                  .map((b) => (
                    <div class="ag-busy">Busy {span(b.start, b.end)}</div>
                  ))}
                <button type="button" class="ag-ses" classList={{ today: isToday && j === 0, mockses: isMock(ses), "on-wall": isMock(ses) }} data-ses={ses.id} data-date={d.date} onClick={() => p.s.openPop(ses.id)}>
                  <span class="t">
                    {clock(minuteOf(ses.start_ms))}
                    <br />
                    {fmtM(ses.minutes)}
                  </span>
                  <div>
                    <div class="h">{ses.title}</div>
                    {raw(mixBar(ses.items))}
                    <div class="r">{ses.items[0]?.reason.replace(/\.$/, "") ?? ""}</div>
                    {isToday && j === 0 ? (
                      <span
                        class="btn btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          location.href = startHref(ses, d.date);
                        }}
                      >
                        Start session
                      </span>
                    ) : null}
                  </div>
                </button>
              </>
            ))
          ) : (
            <div class="ag-empty">{d.windows.length ? "Nothing planned in your windows" : "No window this day"}</div>
          )}
        </>
      );
    };
    return (
      <li class={`ag-day${isToday ? " today" : ""}${before ? ` past st-${was?.status ?? "none"}` : ""}`}>
        <h3>
          {head}
          <small>{before ? "" : d.off ? "Day off" : fmtM(d.minutes)}</small>
        </h3>
        {body()}
      </li>
    );
  };
  return (
    <ol class="agenda" aria-label="Next 7 days">
      <For each={days()}>{day}</For>
    </ol>
  );
}

/** The road to your interviews: what each stretch of the plan is for, and the moments that matter on it. */
export function Road(p: { s: PlanState; c: Ctx }) {
  const c = p.c;
  const start = c.plan.start;
  const { end, phases, milestones } = roadOf(c.plan);
  const len = Math.max(1, dayDiff(start, end));
  const at = (d: string) => `${Math.min(100, Math.max(0, (dayDiff(start, d) / len) * 100)).toFixed(2)}%`;
  const idx = new Map(c.plan.days.map((d, i) => [d.date, i]));
  const when = (d: string) => dateOf(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const mark = (m: Milestone) =>
    m.kind === "interview" ? (
      <span class="rm rm-interview" style={{ left: at(m.date) }} title={`${m.label}, ${when(m.date)}`}>
        {logo(m.iv)}
      </span>
    ) : (
      <span class={`rm rm-${m.kind}`} style={{ left: at(m.date) }} title={`${m.label}, ${when(m.date)}`} />
    );
  const item = (m: Milestone) => {
    const i = idx.get(m.date);
    const inner = (
      <>
        <span class="rl-when">{dayDiff(start, m.date) === 0 ? "Today" : when(m.date)}</span>
        <span class="rl-what">
          {m.kind === "interview" ? logo(m.iv) : <i class={`rl-dot rm-${m.kind}`} />}
          {m.label}
        </span>
      </>
    );
    return (
      <li class={`rl-${m.kind}`}>
        {i !== undefined ? (
          <button type="button" onClick={() => p.s.goTo(i, true)}>
            {inner}
          </button>
        ) : (
          <span class="rl-static">{inner}</span>
        )}
      </li>
    );
  };
  const date = c.plan.interview_date;
  return (
    <section class="panel approach road" aria-labelledby="ap-h">
      <div class="section-head">
        <h2 id="ap-h">{date ? `${plural(c.plan.summary.days_left ?? 0, "day")} to ${short(date)}` : "Next 4 weeks"}</h2>
        <span class="meta">
          {short(start)} to {short(end)}
        </span>
      </div>
      <div class="road-track" aria-hidden="true">
        <div class="road-phases">
          {phases.map((ph) => (
            <span class={`ph ph-${ph.kind}`} style={{ left: at(ph.from), width: `calc(${at(ph.to)} - ${at(ph.from)})` }} title={ph.label}>
              <b>{ph.label}</b>
            </span>
          ))}
        </div>
        <div class="road-line">
          <span class="rm rm-today" style={{ left: "0" }} />
          {milestones.filter((m) => m.kind !== "interview").map(mark)}
          {milestones.filter((m) => m.kind === "interview").map(mark)}
        </div>
      </div>
      {milestones.length ? (
        <ol class="road-list" aria-label="Milestones. Choose one to open its week">
          {milestones.map(item)}
        </ol>
      ) : (
        <p class="text-small text-secondary">No mocks, check-ins or interviews in this stretch yet</p>
      )}
    </section>
  );
}

export function Forecast(p: { c: Ctx }) {
  const c = p.c;
  const date = c.plan.interview_date;
  const all = c.plan.forecast;
  const behind = all.filter((f) => f.behind_by > 0).sort((a, b) => b.behind_by - a.behind_by);
  const started = all.filter((f) => f.behind_by === 0 && f.started_now > 0).sort((a, b) => b.started_now - a.started_now);
  const rest = all.filter((f) => f.behind_by === 0 && f.started_now === 0);
  const ordered = [...behind, ...started, ...rest];
  const rows = ordered.slice(0, FORECAST_ROWS);
  const more = ordered.slice(FORECAST_ROWS);
  const names = [...new Set(all.flatMap((f) => f.companies))];
  const lead = forecastLead({ forecast: all, date, companies: names, weekday: readPrefs().plan.dailyMinutes ?? 60, closeAll: c.fixes?.all ?? null });
  const scale = Math.max(1, ...all.map((r) => Math.max(r.goal, r.projected))) * 1.12;
  const fixAll = c.fixes?.all && behind.length > 1 ? c.fixes.all : null;
  return (
    <section class="panel fc-panel" aria-labelledby="fc-h">
      <div class="section-head" style={{ margin: "0" }}>
        <h2 id="fc-h">{date ? `Where you'll be by ${short(date)}` : "Where you'll be in four weeks"}</h2>
        <span class="meta">If you keep to the plan</span>
      </div>
      {lead ? <p class="fc-lead">{raw(markCompanies(lead, marks(c)))}</p> : null}
      {rows.length ? (
        <div class="fc">{raw(forecastRows(rows, { date, fixes: c.fixes, fix: true, scale }))}</div>
      ) : (
        <p class="fineprint">Add an interview or a target company and this shows the topics their sets lean on, and whether you'll be ready for each in time</p>
      )}
      {more.length ? (
        <details class="fc-more">
          <summary>See all {all.length} topics</summary>
          <div class="fc">{raw(forecastRows(more, { date, fixes: c.fixes, fix: true, scale }))}</div>
        </details>
      ) : null}
      {fixAll ? (
        <p class="fc-all">
          <button type="button" class="fix" data-fix={fixAll}>
            See what weekdays at {fmtM(fixAll)} would change
          </button>
        </p>
      ) : null}
      {rows.length ? raw(forecastKey()) : null}
    </section>
  );
}

export function You(p: { c: Ctx }) {
  const pace = p.c.plan.pace;
  const sample = pace.sample ?? 0;
  const own = sample >= 5;
  const ins = p.c.habits?.insights ?? [];
  const cell = (v: number | null | undefined, label: string) => (
    <div>
      <b>
        {v ?? "–"}
        <small>m</small>
      </b>
      <span>{label}</span>
    </div>
  );
  return (
    <div class="you">
      <section class="panel" aria-labelledby="pc-h">
        <div class="section-head" style={{ margin: "0" }}>
          <h2 id="pc-h">Your pace</h2>
          <span class="meta">{own ? `Last ${sample} solves` : "Targets for now"}</span>
        </div>
        <div class="pace-tbl">
          {cell(pace.review_minutes ?? Math.round((pace.new_minutes.medium ?? 25) * 0.6), "Reviews")}
          {cell(pace.new_minutes.easy, "Easy")}
          {cell(pace.new_minutes.medium, "Medium")}
          {cell(pace.new_minutes.hard, "Hard")}
        </div>
        <p class="fineprint">{withHabit(paceLine(pace, readPrefs().timeTargets), own ? pace.habit : null)}</p>
      </section>
      <section class="panel" aria-labelledby="in-h">
        <div class="section-head" style={{ margin: "0" }}>
          <h2 id="in-h">Practice insights</h2>
          <a class="link text-small" href={`${ROUTES.progress}#insights`}>
            All insights
          </a>
        </div>
        {ins.length ? raw(insightList(ins)) : <p class="fineprint">{INSIGHTS_EMPTY}</p>}
      </section>
    </div>
  );
}

export function EmptyState(p: { s: PlanState; c: Ctx; useSuggest: () => void }) {
  const sug = p.c.habits?.history.suggestion;
  // The suggestion marks times as **bold**; everything else is escaped text.
  const parts = (sug?.text ?? "").split(/\*\*(.+?)\*\*/g);
  return (
    <>
      <Head s={p.s} c={p.c} />
      <div class="panel state-panel">
        <div>
          <h2>When do you usually practice?</h2>
          <p>{sug ? parts.map((x, i) => (i % 2 ? <b>{x}</b> : x)) : "Tell myleet when you can practice and it fits your sessions into those hours. For example, choose weekday evenings or weekend mornings"}</p>
          <div class="btns">
            <button type="button" class="btn btn-primary" onClick={() => p.useSuggest()}>
              Use these times
            </button>
            <button type="button" class="btn btn-secondary" data-act="avail" onClick={() => p.s.openDrawer()}>
              Choose my own
            </button>
          </div>
        </div>
        <div>
          <h3>How sessions are scheduled</h3>
          <ol>
            <li>Puts each day's reviews and new problems into sessions inside your windows</li>
            <li>Sizes sessions from how long you actually take, then adds weekly mocks, closer together near the date</li>
            <li>Moves anything you miss into the next free windows, without stacking it up</li>
          </ol>
        </div>
      </div>
    </>
  );
}
