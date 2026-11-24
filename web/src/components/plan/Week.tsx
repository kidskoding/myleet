import { createMemo, For, Show, type JSX } from "solid-js";
import { companyLogo } from "../../lib/company-logos";
import { clock, dateOf, DAY_SHORT, fmtM, gridHeight, minuteOf, span, toMin, weekdayIndex, windowsOf, yOf, type Win } from "../../lib/schedule";
import type { PlanDay, PlanSession } from "../../lib/types";
import { kbd, plural } from "../../lib/ui/bits";
import { icon } from "../../lib/ui/icons";
import { mixBar } from "../../lib/ui/personal";
import { busyOn, dayName, FOLD, interviewsOn, isMock, ivLabel, lenOf, longDay, mockDone, offWindows, pastOf, startHref, STATUS_TEXT, type Grid, type Sitting } from "./model";
import type { MoverApi } from "./move";
import { raw } from "./raw";
import type { PlanState } from "./state";

const px = (n: number) => `${n.toFixed(1)}px`;

function DayHeader(p: { s: PlanState; d: PlanDay }) {
  const c = () => p.s.ctx();
  const start = () => c()?.plan.start ?? "";
  const isToday = () => p.d.date === start();
  const past = () => p.d.date < start();
  const was = () => (past() ? pastOf(c()!).get(p.d.date) : undefined);
  const load = (): JSX.Element => {
    const cx = c();
    if (!cx) return null;
    if (past()) {
      const w = was();
      return w ? `${STATUS_TEXT[w.status]}, ${fmtM(w.practised)} of ${fmtM(w.planned)}` : "Nothing recorded";
    }
    if (p.d.off) return "Day off";
    const ivs = interviewsOn(cx.plan, p.d.date);
    if (ivs.length)
      return ivs.map((iv) => (
        <span class="dh-iv" title={ivLabel(iv)}>
          {raw(iv.company ? companyLogo(iv.company) : icon("flag"))}
          <span>{iv.time ? `Interview, ${clock(toMin(iv.time)).replace(" ", " ")}` : "Interview"}</span>
        </span>
      ));
    if (!p.d.windows.length) return "No window";
    const g = p.s.grid();
    const planned = p.d.minutes + (isToday() ? (g?.done ?? []).reduce((n, x) => n + x.minutes, 0) : 0);
    return (
      <>
        <span class="bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (planned / Math.max(1, p.d.cap)) * 100).toFixed(0)}%` }} />
        </span>
        {planned}/{p.d.cap}m
      </>
    );
  };
  return (
    <div
      class={`dh${isToday() ? " today" : ""}${p.d.off ? " off" : ""}${past() ? ` past st-${was()?.status ?? "none"}` : ""}`}
      data-date={p.d.date}
      tabindex="-1"
      aria-label={`${longDay(p.d.date)}${isToday() ? ", today" : ""}`}
    >
      <div class="dh-top">
        <span class="dn">
          {DAY_SHORT[weekdayIndex(p.d.date)]} <b>{dateOf(p.d.date).getDate()}</b>
        </span>
        <button type="button" class="icon-btn daymenu" aria-label={`${dayName(p.d.date)} options`} aria-haspopup="menu" aria-expanded={p.s.menu()?.day === p.d.date} onClick={(e) => (p.s.menu()?.day === p.d.date ? p.s.setMenu(null) : p.s.openDayMenu(p.d.date, e.currentTarget))}>
          {raw(icon("ellipsis"))}
        </button>
      </div>
      <span class="load">{load()}</span>
    </div>
  );
}

function SessionBlock(p: { s: PlanState; d: PlanDay; ses: PlanSession; first: boolean }) {
  const a = minuteOf(p.ses.start_ms);
  const len = lenOf(p.ses);
  const isToday = p.d.date === p.s.ctx()?.plan.start && p.first;
  const mock = isMock(p.ses);
  const finished = mock && mockDone(p.ses) !== null;
  const over = p.d.minutes - p.d.cap > 10 && p.ses === p.d.sessions.at(-1) ? p.d.minutes - p.d.cap : 0;
  const when = span(a, a + len);
  const mer = when.match(/ [ap]m$/)?.[0] ?? "";
  const box = () => {
    const g = p.s.grid();
    if (!g) return { top: 0, h: 22 };
    const top = yOf(a, g.bs, g.hour, FOLD);
    return { top, h: Math.max(22, yOf(a + len, g.bs, g.hour, FOLD) - top) };
  };
  return (
    <li>
      <div
        role="button"
        tabindex="0"
        aria-describedby="ses-hint"
        class="ses"
        classList={{ today: isToday, mockses: mock, "on-wall": mock, "mock-done": finished, short: box().h < 54, tall: box().h >= 84, "is-open": p.s.openSes() === p.ses.id }}
        style={{ top: px(box().top), height: px(box().h) }}
        data-ses={p.ses.id}
        data-date={p.d.date}
        aria-label={`${dayName(p.d.date)} ${when}, ${fmtM(p.ses.minutes)}: ${p.ses.title}${p.ses.moved_from ? `, moved from ${dayName(p.ses.moved_from)}` : ""}. Open details`}
        title={`${p.ses.title}, ${fmtM(p.ses.minutes)}`}
      >
        <span class="t">
          {isToday && box().h < 84 ? (
            clock(a)
          ) : (
            <>
              {when.replace(/ [ap]m$/, "")}
              <span class="mer">{mer}</span>
            </>
          )}
          {over ? (
            <>
              , <span class="over">{over} min over</span>
            </>
          ) : null}
        </span>
        <span class="h">{finished ? <>{raw(icon("check"))}Mock done</> : p.ses.title}</span>
        <span class="mm">{fmtM(p.ses.minutes)}</span>
        {raw(mixBar(p.ses.items))}
        <Show when={isToday}>
          <a class="btn btn-primary btn-sm start" href={startHref(p.ses, p.d.date)} data-start aria-label="Start session (s)">
            {box().h >= 84 ? <>Start session {raw(kbd("s"))}</> : "Start"}
          </a>
        </Show>
      </div>
    </li>
  );
}

function DoneBlock(p: { s: PlanState; x: Sitting }) {
  const what = p.x.clean ? plural(p.x.clean, "clean pass", "clean passes") : p.x.solved ? `${p.x.solved} solved` : plural(p.x.minutes, "minute");
  const box = () => {
    const g = p.s.grid();
    if (!g) return { top: 0, h: 30 };
    const top = yOf(p.x.start, g.bs, g.hour, FOLD);
    return { top, h: Math.max(30, yOf(p.x.end, g.bs, g.hour, FOLD) - top) };
  };
  return (
    <li>
      <div class="ses done" style={{ top: px(box().top), height: px(box().h) }} aria-label={`Done today, ${span(p.x.start, p.x.end)}: ${what}`}>
        <span class="h">
          {raw(icon("check"))}
          {what}
        </span>
      </div>
    </li>
  );
}

/** A window as the grid draws it: clipped to the shown hours, null when it sits wholly inside a fold. */
function winBox(w: Win, g: Grid): [number, number] | null {
  const from = g.bs.find((b) => b.fold && w.start >= b.from && w.start < b.to);
  const to = g.bs.find((b) => b.fold && w.end > b.from && w.end <= b.to);
  const a = from ? from.to : w.start;
  const b = to ? to.from : w.end;
  const top = yOf(a, g.bs, g.hour, FOLD);
  const h = yOf(b, g.bs, g.hour, FOLD) - top;
  return b > a && h >= 1 ? [top, h] : null;
}

function Band(p: { s: PlanState; w: Win; class: string; title?: string; children?: JSX.Element }) {
  const box = () => {
    const g = p.s.grid();
    return g ? winBox(p.w, g) : null;
  };
  return (
    <div class={p.class} title={p.title} style={box() ? { top: `${box()?.[0]}px`, height: `${box()?.[1]}px` } : { display: "none" }}>
      {p.children}
    </div>
  );
}

function Column(p: { s: PlanState; d: PlanDay; i: number }) {
  const c = p.s.ctx()!;
  const isToday = p.d.date === c.plan.start;
  const wins = p.d.off ? offWindows(p.d.date) : windowsOf(p.d);
  const used = (w: Win) => p.d.sessions.some((x) => minuteOf(x.start_ms) < w.end && minuteOf(x.end_ms) > w.start) || (isToday && w.end <= p.s.nowMin());
  // Busy time sits under the sessions as stripes, so a session's place makes sense at a glance.
  const busy = p.d.off ? [] : busyOn(p.d.date);
  const nowTop = () => {
    const g = p.s.grid();
    const m = p.s.nowMin();
    return isToday && g?.bs.length && m >= (g.bs[0]?.from ?? 0) && m <= (g.bs.at(-1)?.to ?? 0) ? yOf(m, g.bs, g.hour, FOLD) : null;
  };
  return (
    <section class="col" classList={{ today: isToday, off: p.d.off, past: p.d.date < c.plan.start }} data-day={p.i} data-date={p.d.date} aria-label={`${longDay(p.d.date)}${p.d.off ? ", day off" : ""}`}>
      <For each={wins}>{(w) => <Band s={p.s} w={w} class="win">{!used(w) && !p.d.off ? <span class="free">Free window</span> : null}</Band>}</For>
      <For each={busy}>
        {(b) => (
          <Band s={p.s} w={b} class="busy" title={`Busy ${span(b.start, b.end)} in Google Calendar`}>
            <span>Busy</span>
          </Band>
        )}
      </For>
      <Show when={p.d.off}>
        <span class="offtag">Day off. Its work moved to the next free windows</span>
      </Show>
      <ol aria-label={`Sessions on ${dayName(p.d.date)}`}>
        <Show when={isToday}>
          <For each={p.s.grid()?.done ?? []}>{(x) => <DoneBlock s={p.s} x={x} />}</For>
        </Show>
        <For each={p.d.sessions}>{(ses, j) => <SessionBlock s={p.s} d={p.d} ses={ses} first={j() === 0} />}</For>
      </ol>
      <Show when={nowTop() !== null}>
        <div class="now" style={{ top: `${nowTop()}px` }} aria-hidden="true" />
      </Show>
    </section>
  );
}

type Rule = { y: number; label: string; edge: boolean };
type Line = { y: number; kind: "fold" | "hl" | "half"; from: number; to: number };

/** The hour ruler, rules and folded bands for a scale. */
function gridLines(g: Grid): { ruler: Rule[]; lines: Line[] } {
  const ruler: Rule[] = [];
  const lines: Line[] = [];
  for (const b of g.bs) {
    const y0 = yOf(b.from, g.bs, g.hour, FOLD);
    if (b.fold) {
      lines.push({ y: y0, kind: "fold", from: b.from, to: b.to });
      continue;
    }
    ruler.push({ y: y0, label: clock(b.from), edge: true });
    for (let m = Math.ceil(b.from / 30) * 30; m < b.to; m += 30) {
      const y = yOf(m, g.bs, g.hour, FOLD);
      if (m % 60) lines.push({ y, kind: "half", from: m, to: m });
      else {
        if (m !== b.from) lines.push({ y, kind: "hl", from: m, to: m });
        if (m - b.from >= 20) ruler.push({ y, label: clock(m), edge: false });
      }
    }
  }
  return { ruler, lines };
}

export function Week(p: { s: PlanState; mover: MoverApi; ghost: (el: HTMLElement) => void; tip: (el: HTMLElement) => void }) {
  const g = () => p.s.grid();
  const empty = () => {
    const gr = g();
    return !gr || (!gr.done.length && gr.days.every((d) => !d.sessions.length));
  };
  const why = () => {
    const days = g()?.days ?? [];
    return days.every((d) => d.off)
      ? "Every day this week is off. Put one back from its day menu, or add windows for the days around it."
      : days.every((d) => d.off || !d.windows.length)
        ? "None of your practice windows fall on these days. Add one and the plan fills it."
        : "Nothing is due on these days yet. Sessions appear here once a window has room for them.";
  };
  const lines = createMemo(() => {
    const gr = g();
    return gr ? gridLines(gr) : { ruler: [], lines: [] };
  });
  return (
    <div class="panel week-cal" style={{ "--cols": String(g()?.days.length ?? 7) }}>
      <div class="wk wk-head">
        <div />
        <For each={g()?.days ?? []}>{(d) => <DayHeader s={p.s} d={d} />}</For>
      </div>
      <Show
        when={!empty()}
        fallback={
          <div class="wk-empty">
            <h3>No sessions this week</h3>
            <p>{why()}</p>
            <button type="button" class="btn btn-secondary btn-sm" data-act="avail" onClick={() => p.s.openDrawer()}>
              {raw(icon("clock-3"))}Edit availability
            </button>
          </div>
        }
      >
        <div class="wk wk-body" ref={(el) => (p.s.refs.body = el)} style={{ height: `${g() ? gridHeight(g()!.bs, g()!.hour, FOLD) : 0}px` }} onPointerDown={(e) => p.mover.onPointerDown(e)}>
          <div class="ruler" aria-hidden="true">
            <For each={lines().ruler}>{(r) => <span classList={{ edge: r.edge }} style={{ top: `${r.y}px` }}>{r.label}</span>}</For>
          </div>
          <For each={g()?.days ?? []}>{(d, i) => <Column s={p.s} d={d} i={i()} />}</For>
          <div class="lines">
            <For each={lines().lines}>
              {(l) =>
                l.kind === "fold" ? (
                  <button type="button" class="fold" style={{ top: `${l.y}px`, height: `${FOLD}px` }} aria-label={`Show ${span(l.from, l.to)}`} onClick={() => p.s.unfold(l.from, l.to)}>
                    {span(l.from, l.to)}, free
                  </button>
                ) : (
                  <div class="hl" classList={{ half: l.kind === "half" }} style={{ top: `${l.y}px` }} />
                )
              }
            </For>
          </div>
          <div class="ghost-ses" ref={p.ghost}>
            <div class="dragtip on-wall" ref={p.tip} />
          </div>
        </div>
      </Show>
    </div>
  );
}
