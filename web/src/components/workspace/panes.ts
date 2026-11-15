// Pane layout: draggable and keyboard-resizable gutters (1:1 with the pointer, a spring
// settle on release), collapse to rails (Ctrl/Cmd+B, Ctrl/Cmd+J), zen, F6 focus cycling,
// and the phone's one-pane-at-a-time switcher. Sizes persist per device.

import { $, $$ } from "./ui";

const KEY = "myleet-panes";
const MIN_PROBLEM_PX = 280;
const MIN_EDITOR_PX = 360;
const MIN_TESTS_PX = 120;
const DEFAULT_LEFT = 36;
const DEFAULT_TESTS = 37;
const PHONE = "(max-width: 760px)";

interface Saved {
  left: number;
  tests: number;
  hideProblem: boolean;
  hideTests: boolean;
}

export type MobilePane = "problem" | "code" | "tests";

export interface Panes {
  toggleProblem(force?: boolean): void;
  toggleTests(force?: boolean): void;
  zen(): void;
  isZen(): boolean;
  cycleFocus(dir: 1 | -1): void;
  showMobile(p: MobilePane): void;
  isPhone(): boolean;
  /** Makes sure the tests pane is visible (after a run). */
  revealTests(): void;
  revealProblem(): void;
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>;
    return {
      left: typeof s.left === "number" ? s.left : DEFAULT_LEFT,
      tests: typeof s.tests === "number" ? s.tests : DEFAULT_TESTS,
      hideProblem: !!s.hideProblem,
      hideTests: !!s.hideTests,
    };
  } catch {
    return { left: DEFAULT_LEFT, tests: DEFAULT_TESTS, hideProblem: false, hideTests: false };
  }
}

export function setupPanes(root: HTMLElement, o: { focusEditor(): void; onChange?(): void }): Panes {
  const ws = $(root, ".ws");
  const right = $(root, ".right-col");
  const gv = $(root, '[data-gutter="problem"]');
  const gh = $(root, '[data-gutter="tests"]');
  const s = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // Storage refused: sizes just don't persist.
    }
  };
  const phone = () => matchMedia(PHONE).matches;

  const apply = () => {
    root.style.setProperty("--left", `${s.left}%`);
    root.style.setProperty("--tests", `${s.tests}%`);
    root.toggleAttribute("data-hide-problem", s.hideProblem);
    root.toggleAttribute("data-hide-tests", s.hideTests);
    $(root, '[data-rail="problem"]').hidden = !s.hideProblem;
    $(root, '[data-rail="tests"]').hidden = !s.hideTests;
    gv.setAttribute("aria-valuenow", String(Math.round(s.left)));
    gh.setAttribute("aria-valuenow", String(Math.round(s.tests)));
    $(root, '[data-act="zen"]').setAttribute("aria-pressed", String(s.hideProblem && s.hideTests));
    o.onChange?.();
  };

  const clampLeft = (pct: number) => {
    const w = ws.clientWidth;
    const min = (MIN_PROBLEM_PX / w) * 100;
    const max = 100 - ((MIN_EDITOR_PX + 24) / w) * 100;
    return Math.min(Math.max(pct, min), Math.max(min, max));
  };
  const clampTests = (pct: number) => {
    const hgt = right.clientHeight;
    const min = (MIN_TESTS_PX / hgt) * 100;
    const max = 100 - (160 / hgt) * 100;
    return Math.min(Math.max(pct, min), Math.max(min, max));
  };

  /** Pointer drag, 1:1, with a spring settle onto the clamped value on release. */
  const drag = (g: HTMLElement, axis: "x" | "y") => {
    g.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      g.setPointerCapture(e.pointerId);
      g.classList.add("is-drag");
      root.classList.add("is-resizing", axis === "x" ? "is-resizing-v" : "is-resizing-h");
      const box = (axis === "x" ? ws : right).getBoundingClientRect();
      const grab = axis === "x" ? e.clientX - g.getBoundingClientRect().left : e.clientY - g.getBoundingClientRect().top;
      const move = (ev: PointerEvent) => {
        if (axis === "x") {
          s.left = ((ev.clientX - grab - box.left) / box.width) * 100;
          root.style.setProperty("--left", `${s.left}%`);
        } else {
          s.tests = ((box.bottom - (ev.clientY - grab) - 8) / box.height) * 100;
          root.style.setProperty("--tests", `${s.tests}%`);
        }
      };
      const up = () => {
        g.removeEventListener("pointermove", move);
        g.removeEventListener("pointerup", up);
        g.removeEventListener("pointercancel", up);
        g.classList.remove("is-drag");
        root.classList.remove("is-resizing", "is-resizing-v", "is-resizing-h");
        const settle = axis === "x" ? ws : right;
        settle.classList.add("is-settling");
        if (axis === "x") s.left = clampLeft(s.left);
        else s.tests = clampTests(s.tests);
        apply();
        save();
        setTimeout(() => settle.classList.remove("is-settling"), 300);
      };
      g.addEventListener("pointermove", move);
      g.addEventListener("pointerup", up);
      g.addEventListener("pointercancel", up);
    });
    g.addEventListener("dblclick", () => {
      if (axis === "x") s.left = DEFAULT_LEFT;
      else s.tests = DEFAULT_TESTS;
      apply();
      save();
    });
    g.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 2;
      let d = 0;
      if (axis === "x" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) d = e.key === "ArrowRight" ? step : -step;
      if (axis === "y" && (e.key === "ArrowUp" || e.key === "ArrowDown")) d = e.key === "ArrowUp" ? step : -step;
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        if (axis === "x") s.left = clampLeft(e.key === "Home" ? 0 : 100);
        else s.tests = clampTests(e.key === "Home" ? 0 : 100);
      } else if (d) {
        e.preventDefault();
        if (axis === "x") s.left = clampLeft(s.left + d);
        else s.tests = clampTests(s.tests + d);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (axis === "x") panes.toggleProblem();
        else panes.toggleTests();
        return;
      } else return;
      apply();
      save();
    });
  };
  drag(gv, "x");
  drag(gh, "y");

  $(root, '[data-rail="problem"]').addEventListener("click", () => panes.toggleProblem(false));
  $(root, '[data-rail="tests"]').addEventListener("click", () => panes.toggleTests(false));

  const mtabs = $$<HTMLButtonElement>(root, "[data-mtab]");
  for (const t of mtabs) t.addEventListener("click", () => panes.showMobile(t.dataset["mtab"] as MobilePane));

  const visiblePanes = (): HTMLElement[] => {
    if (phone()) return [$(root, `[data-pane="${ws.dataset["mpane"] === "code" ? "editor" : ws.dataset["mpane"]}"]`)];
    return [
      ...(s.hideProblem ? [] : [$(root, '[data-pane="problem"]')]),
      $(root, '[data-pane="editor"]'),
      ...(s.hideTests ? [] : [$(root, '[data-pane="tests"]')]),
    ];
  };

  const focusPane = (p: HTMLElement) => {
    if (p.dataset["pane"] === "editor") {
      o.focusEditor();
      return;
    }
    p.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  };

  const panes: Panes = {
    toggleProblem(force) {
      if (phone()) {
        panes.showMobile(ws.dataset["mpane"] === "problem" ? "code" : "problem");
        return;
      }
      s.hideProblem = force ?? !s.hideProblem;
      apply();
      save();
      if (!s.hideProblem) $(root, '[data-pane="problem"] [role="tab"][aria-selected="true"]').focus();
    },
    toggleTests(force) {
      if (phone()) {
        panes.showMobile(ws.dataset["mpane"] === "tests" ? "code" : "tests");
        return;
      }
      s.hideTests = force ?? !s.hideTests;
      apply();
      save();
    },
    zen() {
      const on = !(s.hideProblem && s.hideTests);
      s.hideProblem = on;
      s.hideTests = on;
      apply();
      save();
      o.focusEditor();
    },
    isZen: () => s.hideProblem && s.hideTests,
    cycleFocus(dir) {
      const list = visiblePanes();
      const at = list.findIndex((p) => p.contains(document.activeElement));
      const next = list[(at + dir + list.length) % list.length] ?? list[0];
      if (next) focusPane(next);
    },
    showMobile(p) {
      ws.dataset["mpane"] = p;
      for (const t of mtabs) t.setAttribute("aria-selected", String(t.dataset["mtab"] === p));
      o.onChange?.();
    },
    isPhone: phone,
    revealTests() {
      if (phone()) panes.showMobile("tests");
      else if (s.hideTests && !s.hideProblem) panes.toggleTests(false);
    },
    revealProblem() {
      if (phone()) panes.showMobile("problem");
      else if (s.hideProblem) panes.toggleProblem(false);
    },
  };

  apply();
  return panes;
}
