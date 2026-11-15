// Small DOM helpers for the workspace island: element builder, anchored popovers that
// close on Esc / outside click and return focus, the toast, and the polite live region.

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined | ((e: Event) => void)> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, "").toLowerCase(), v);
    else if (k === "html") el.innerHTML = String(v);
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function $<T extends Element = HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`workspace: missing ${sel}`);
  return el as T;
}

export function $$<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return [...root.querySelectorAll<T>(sel)];
}

let openPop: { close(restore?: boolean): void } | null = null;

export function closePopover(): boolean {
  if (!openPop) return false;
  openPop.close(true);
  return true;
}

/**
 * Shows `el` anchored under `anchor` (right-aligned to it), inside `host`. One at a time;
 * Esc or a click outside closes it and returns focus to the anchor.
 */
export function popover(host: HTMLElement, anchor: HTMLElement, el: HTMLElement, opts: { onClose?(): void; focus?: HTMLElement | null } = {}): () => void {
  openPop?.close(false);
  el.classList.add("popover");
  host.append(el);
  const place = () => {
    const a = anchor.getBoundingClientRect();
    const hb = host.getBoundingClientRect();
    const w = el.offsetWidth;
    let left = a.right - hb.left - w;
    left = Math.max(8, Math.min(left, hb.width - w - 8));
    el.style.left = `${left}px`;
    el.style.top = `${a.bottom - hb.top + 6}px`;
  };
  place();
  anchor.setAttribute("aria-expanded", "true");
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  };
  const onDown = (e: PointerEvent) => {
    if (!el.contains(e.target as Node) && !anchor.contains(e.target as Node)) close(false);
  };
  const close = (restore = true) => {
    if (!el.isConnected) return;
    el.remove();
    anchor.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerdown", onDown, true);
    window.removeEventListener("resize", place);
    if (openPop?.close === close) openPop = null;
    if (restore) anchor.focus();
    opts.onClose?.();
  };
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("pointerdown", onDown, true);
  window.addEventListener("resize", place);
  openPop = { close };
  (opts.focus ?? el.querySelector<HTMLElement>("button, input, select, [tabindex]"))?.focus();
  return () => close(false);
}

/** A confirm with the consequence stated; the safe choice has focus. */
export function confirmPop(
  host: HTMLElement,
  anchor: HTMLElement,
  o: { title: string; body: string; ok: string; cancel: string; danger?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      close();
      resolve(v);
    };
    const cancel = h("button", { class: "btn btn-ghost", onclick: () => finish(false) }, o.cancel);
    const el = h(
      "div",
      { class: "confirm", role: "alertdialog", "aria-labelledby": "wsx-confirm-h", "aria-describedby": "wsx-confirm-p" },
      h("h3", { id: "wsx-confirm-h" }, o.title),
      h("p", { id: "wsx-confirm-p" }, o.body),
      h("div", { class: "acts" }, cancel, h("button", { class: o.danger ? "btn btn-quiet-danger" : "btn btn-primary", onclick: () => finish(true) }, o.ok)),
    );
    const close = popover(host, anchor, el, { focus: cancel, onClose: () => finish(false) });
  });
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Bottom-centre toast, one at a time, 6 s (8 s with Undo). */
export function toast(slot: HTMLElement, text: string, undo?: () => void): void {
  clearTimeout(toastTimer);
  slot.replaceChildren();
  const el = h(
    "div",
    { class: "toast", role: "status" },
    h("span", {}, text),
    undo
      ? h(
          "button",
          {
            class: "btn btn-ghost btn-sm",
            onclick: () => {
              undo();
              slot.replaceChildren();
            },
          },
          "Undo",
        )
      : null,
  );
  slot.append(el);
  toastTimer = setTimeout(() => el.remove(), undo ? 8000 : 6000);
}

export function announcer(region: HTMLElement): (msg: string) => void {
  return (msg) => {
    region.textContent = "";
    // A fresh text node after a tick is read even when the message repeats.
    setTimeout(() => (region.textContent = msg), 40);
  };
}

export function formatDateTime(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const today = new Date(now);
  const same = d.toDateString() === today.toDateString();
  const yesterday = new Date(now - 86_400_000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, " ");
  if (same) return `Today, ${time}`;
  if (yesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

export function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
