// Moving a session on the week grid. Pointer drag and keyboard share one preview (the ghost).
// The block rides a transform, so a move never lays out per frame; all work happens once per frame.
import { DAY_SHORT, freeDrop, minuteAt, minuteOf, span, weekdayIndex, windowsOf, yOf, type Band, type DropBlock, type Win } from "../../lib/schedule";
import type { PlanDay } from "../../lib/types";
import { busyOn, dayName, FOLD, isMock, lenOf, mockDone, mockLink, reduced } from "./model";
import type { PlanState } from "./state";

/** A visible day column, measured once when a move starts so moving never reads layout. */
interface Lane {
  x: number;
  w: number;
  day: PlanDay;
  wins: Win[];
  busy: Win[];
  notBefore: number;
}

/** Where a move would land and whether it can. */
interface Landing {
  lane: number;
  start: number;
  outside: boolean;
  blocked: DropBlock | null;
}

interface Mover {
  el: HTMLElement;
  id: string;
  minutes: number;
  from: { lane: number; start: number };
  lanes: Lane[];
  key: string;
  at: Landing | null;
}

interface Drag {
  el: HTMLElement;
  pointer: number;
  x0: number;
  y0: number;
  sy0: number;
  top0: number;
  bodyLeft: number;
  cx: number;
  cy: number;
  m: Mover | null;
  frame: number;
  /** The folded band the block is over and the timer that opens it. */
  over: string;
  overTimer: number;
}

const BLOCK_TEXT: Record<DropBlock, string> = { off: "That day is off", past: "That time has passed", overlap: "Overlaps another session" };
const SPRING = "cubic-bezier(0.34, 1.32, 0.64, 1)";
const EDGE = 48;

export function createMover(s: PlanState, ghost: () => HTMLElement | undefined, tip: () => HTMLElement | undefined) {
  let drag: Drag | null = null;
  let kb: (Mover & { lane: number; start: number }) | null = null;
  let lastTap = { id: "", at: 0 };
  let edgeTop = 104;

  const g = () => s.grid();
  const y = (m: number) => {
    const gr = g();
    return gr ? yOf(m, gr.bs, gr.hour, FOLD) : 0;
  };

  function startMove(el: HTMLElement): Mover | null {
    const c = s.ctx();
    const gr = g();
    const body = s.refs.body;
    const hit = s.findSession(el.dataset.ses ?? "");
    const gh = ghost();
    if (!c || !gr || !body || !hit || !gh) return null;
    const nowMin = minuteOf(c.now.getTime());
    const cols = [...body.querySelectorAll<HTMLElement>(".col")];
    const lanes = gr.days.map((d, i): Lane => {
      const col = cols[i];
      // A drop snaps past calendar busy time as well as other sessions.
      const busy = [...d.sessions.filter((x) => x.id !== hit[1].id).map((x) => ({ start: minuteOf(x.start_ms), end: minuteOf(x.end_ms) })), ...busyOn(d.date)];
      if (d.date === c.plan.start) for (const x of gr.done) busy.push({ start: x.start, end: x.end });
      return { x: col?.offsetLeft ?? 0, w: col?.offsetWidth ?? 0, day: d, wins: windowsOf(d), busy, notBefore: d.date === c.plan.start ? nowMin : 0 };
    });
    gh.style.height = `${el.offsetHeight}px`;
    const lane = Math.max(0, lanes.findIndex((l) => l.day.date === hit[0].date));
    return { el, id: hit[1].id, minutes: lenOf(hit[1]), from: { lane, start: minuteOf(hit[1].start_ms) }, lanes, key: "", at: null };
  }

  /** Moves the ghost to a slot (CSS glides it) and says what a drop there would do. */
  function preview(m: Mover, lane: number, minute: number): Landing | null {
    const l = m.lanes[lane];
    const gh = ghost();
    const tp = tip();
    if (!l || !gh || !tp) return null;
    const f = freeDrop(minute, m.minutes, { wins: l.wins, busy: l.busy, off: l.day.off, notBefore: l.notBefore });
    const at: Landing = { lane, ...f };
    m.at = at;
    const key = `${lane}|${f.start}|${f.blocked}`;
    if (key === m.key) return at;
    m.key = key;
    gh.style.width = `${l.w - 8}px`;
    gh.style.transform = `translate3d(${l.x + 4}px, ${y(f.start)}px, 0)`;
    gh.classList.toggle("bad", !!f.blocked);
    gh.classList.add("on");
    const when = `${DAY_SHORT[weekdayIndex(l.day.date)]} ${span(f.start, f.start + m.minutes)}`;
    tp.textContent = f.blocked ? `${when}. ${BLOCK_TEXT[f.blocked]}` : f.outside ? `${when}. Outside your usual hours` : when;
    return at;
  }

  function endMove(m: Mover): void {
    ghost()?.classList.remove("on", "bad");
    m.el.classList.remove("lifted", "kb-lifted", "pressed");
  }

  /** Drops at the landing, or glides back when there is none. The moved block settles with a short spring. */
  function finishMove(m: Mover, drop: boolean): void {
    const at = drop ? m.at : null;
    const same = at && at.lane === m.from.lane && at.start === m.from.start;
    const to = at && !at.blocked && !same ? { date: m.lanes[at.lane]?.day.date ?? "", start: at.start } : null;
    const fromRect = m.el.getBoundingClientRect();
    const still = reduced();
    if (!to) {
      const tf = m.el.style.transform;
      m.el.style.transform = "";
      endMove(m);
      if (tf && !still) m.el.animate([{ transform: tf }, { transform: "none" }], { duration: 180, easing: SPRING });
      if (at?.blocked) s.say(`Not moved. ${BLOCK_TEXT[at.blocked]}`);
      return;
    }
    endMove(m);
    s.applyMove(m.id, to.date, to.start);
    const body = s.refs.body;
    const moved = [...(body?.querySelectorAll<HTMLElement>(`.ses[data-date="${to.date}"]`) ?? [])].find((el) => {
      const hit = s.findSession(el.dataset.ses ?? "");
      return hit && minuteOf(hit[1].start_ms) === to.start;
    });
    if (moved && !still) {
      const r = moved.getBoundingClientRect();
      moved.animate([{ transform: `translate(${fromRect.left - r.left}px, ${fromRect.top - r.top}px) scale(1.02)`, boxShadow: "var(--shadow-md)" }, { transform: "none", boxShadow: "none" }], {
        duration: 180,
        easing: SPRING,
      });
    }
    // The planner can merge a block into its neighbour; then keep focus on that day's first session.
    (moved ?? body?.querySelector<HTMLElement>(`.ses[data-date="${to.date}"]`))?.focus({ preventScroll: true });
  }

  function laneAt(m: Mover, x: number): number {
    const i = m.lanes.findIndex((l) => x >= l.x && x < l.x + l.w);
    if (i >= 0) return i;
    return x < (m.lanes[0]?.x ?? 0) ? 0 : m.lanes.length - 1;
  }

  function onPointerDown(e: PointerEvent): void {
    const t = e.target as Element;
    const el = t.closest<HTMLElement>(".ses:not(.done)");
    if (!el || e.button !== 0 || kb || t.closest("a,button")) return;
    const body = s.refs.body;
    if (!body || !s.findSession(el.dataset.ses ?? "")) return;
    el.classList.add("pressed");
    el.setPointerCapture(e.pointerId);
    drag = { el, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, sy0: scrollY, top0: el.offsetTop, bodyLeft: body.getBoundingClientRect().left, cx: e.clientX, cy: e.clientY, m: null, frame: 0, over: "", overTimer: 0 };
  }

  function onPointerMove(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.pointer) return;
    drag.cx = e.clientX;
    drag.cy = e.clientY;
    if (!drag.m) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.m = startMove(drag.el);
      if (!drag.m) return;
      drag.el.classList.add("lifted");
      edgeTop = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 56) + EDGE;
    }
    if (!drag.frame) drag.frame = requestAnimationFrame(dragFrame);
  }

  function dragFrame(): void {
    const d = drag;
    const gr = g();
    if (!d?.m || !gr) return;
    d.frame = 0;
    // Near the top or bottom edge the page scrolls, faster the closer the pointer is.
    const bottom = innerHeight - EDGE;
    const v = d.cy < edgeTop ? -Math.min(16, (edgeTop - d.cy) / 3) : d.cy > bottom ? Math.min(16, (d.cy - bottom) / 3) : 0;
    if (v) scrollBy(0, v);
    const dy = d.cy - d.y0 + (scrollY - d.sy0);
    d.el.style.transform = `translate3d(${d.cx - d.x0}px, ${dy}px, 0)${reduced() ? "" : " scale(1.02)"}`;
    hoverFold(d, d.top0 + dy, gr.bs, gr.hour);
    preview(d.m, laneAt(d.m, d.cx - d.bodyLeft), minuteAt(d.top0 + dy, gr.bs, gr.hour, FOLD));
    if (v) d.frame = requestAnimationFrame(dragFrame);
  }

  /** A block held over a folded band for 400 ms opens it, so a drop can land in those hours. */
  function hoverFold(d: Drag, at: number, bs: Band[], hour: number): void {
    let top = 0;
    let band: Band | null = null;
    for (const b of bs) {
      const len = b.fold ? FOLD : ((b.to - b.from) / 60) * hour;
      if (at >= top && at < top + len) band = b.fold ? b : null;
      top += len;
    }
    const key = band ? `${band.from}-${band.to}` : "";
    if (key === d.over) return;
    clearTimeout(d.overTimer);
    d.over = key;
    if (!band) return;
    const { from, to } = band;
    d.overTimer = window.setTimeout(() => {
      if (drag !== d || !d.m) return;
      const was = d.top0;
      s.unfold(from, to);
      // The block keeps its place under the pointer while the hours open around it.
      d.top0 = d.el.offsetTop;
      d.y0 += d.top0 - was;
      d.m.key = "";
      d.over = "";
      if (!d.frame) d.frame = requestAnimationFrame(dragFrame);
    }, 400);
  }

  function endDrag(e: PointerEvent, cancelled = false): void {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.frame);
    clearTimeout(d.overTimer);
    d.el.classList.remove("pressed");
    if (d.m) return finishMove(d.m, !cancelled);
    if (cancelled) return;
    const id = d.el.dataset.ses ?? "";
    // A second press within 400 ms is a double-click (counted here: pointer capture eats native dblclick). It starts a planned mock.
    const hit = s.findSession(id);
    if (lastTap.id === id && Date.now() - lastTap.at < 400 && hit && isMock(hit[1]) && !mockDone(hit[1])) return void (location.href = mockLink(hit[1]));
    lastTap = { id, at: Date.now() };
    s.openPop(id);
  }

  // Keyboard: Space lifts, arrows move a day or 15 minutes (any free time), Space or Enter drops, Escape cancels.
  function kbLift(el: HTMLElement): void {
    const m = startMove(el);
    if (!m) return;
    kb = { ...m, lane: m.from.lane, start: m.from.start };
    el.classList.add("kb-lifted");
    kbShow();
    s.say(`Picked up ${span(m.from.start, m.from.start + m.minutes)} on ${dayName(m.lanes[m.from.lane]?.day.date ?? "")}. Left and right change day, up and down move 15 minutes. Space drops, Escape cancels`);
  }

  /** Up/down step 15 minutes inside the grid's shown hours, hopping over folded gaps. */
  function kbStep(key: string): void {
    const k = kb;
    if (!k) return;
    if (key === "ArrowLeft" || key === "ArrowRight") k.lane = Math.max(0, Math.min(k.lanes.length - 1, k.lane + (key === "ArrowRight" ? 1 : -1)));
    else {
      const next = k.start + (key === "ArrowDown" ? 15 : -15);
      const fold = g()?.bs.find((b) => b.fold && next + k.minutes > b.from && next < b.to);
      // Stepping into a folded span opens it, so the move lands in real hours.
      if (fold) s.unfold(fold.from, fold.to);
      const bs = g()?.bs ?? [];
      k.start = Math.max(bs[0]?.from ?? 0, Math.min(next, (bs.at(-1)?.to ?? 24 * 60) - k.minutes));
      k.key = "";
    }
    kbShow();
  }

  function kbShow(): void {
    const k = kb;
    if (!k) return;
    const at = preview(k, k.lane, k.start);
    const l = k.lanes[k.lane];
    const home = k.lanes[k.from.lane];
    if (!at || !l || !home) return;
    // The block glides to the slot (CSS transition on .kb-lifted); the ghost marks it.
    k.el.style.transform = `translate3d(${l.x - home.x}px, ${y(at.start) - y(k.from.start)}px, 0)`;
    s.say(tip()?.textContent ?? "");
  }

  function kbEnd(drop: boolean): void {
    const m = kb;
    if (!m) return;
    kb = null;
    if (!drop) s.say("Move canceled");
    finishMove(m, drop);
  }

  return {
    onPointerDown,
    onPointerMove,
    endDrag,
    kbLift,
    kbStep,
    kbEnd,
    lifting: () => !!kb,
    busy: () => !!drag || !!kb,
  };
}

export type MoverApi = ReturnType<typeof createMover>;
