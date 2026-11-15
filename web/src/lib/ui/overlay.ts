// Toasts, dialogs and global banners. Shell-level pieces any page can call.
import { html, render, type SafeHtml } from "./html";
import { icon, type IconName } from "./icons";

// ---- toasts: bottom centre, one at a time, 6 s, optional Undo ----

export interface ToastAction {
  label: string;
  run: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string, opts: { action?: ToastAction; ms?: number } = {}): void {
  const region = document.getElementById("toasts");
  if (!region) return;
  clearTimeout(toastTimer);
  render(
    region,
    html`<div class="toast"><span>${message}</span>${opts.action ? html`<button class="btn btn-ghost btn-sm" data-act>${opts.action.label}</button>` : ""}<button class="icon-btn" data-close aria-label="Dismiss">${icon("x")}</button></div>`,
  );
  const el = region.firstElementChild as HTMLElement;
  const close = () => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 160);
  };
  el.querySelector("[data-act]")?.addEventListener("click", () => {
    opts.action?.run();
    close();
  });
  el.querySelector("[data-close]")?.addEventListener("click", close);
  toastTimer = setTimeout(close, opts.ms ?? 6000);
}

// ---- dialogs (native <dialog class="dlg">) ----

export function openDialog(d: HTMLDialogElement | null): void {
  if (!d || d.open) return;
  d.classList.remove("is-closing");
  d.showModal();
  // Clicking the scrim (the dialog box itself, outside its content) closes it.
  d.onclick = (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeDialog(d);
  };
}

export function closeDialog(d: HTMLDialogElement | null, value = ""): void {
  if (!d?.open) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
  if (reduce) return d.close(value);
  d.classList.add("is-closing");
  setTimeout(() => {
    d.classList.remove("is-closing");
    d.close(value);
  }, 150);
}

/** A one-off confirm dialog; resolves true on confirm. */
export function confirmDialog(o: {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dlg";
    d.setAttribute("role", "alertdialog");
    d.setAttribute("aria-labelledby", "cf-title");
    d.setAttribute("aria-describedby", "cf-body");
    render(
      d,
      html`<div class="dlg-head"><h2 id="cf-title">${o.title}</h2></div>
        <div class="dlg-body"><p id="cf-body">${o.body}</p></div>
        <div class="dlg-actions"><button class="btn btn-ghost" value="cancel" autofocus>Cancel</button><button class="btn ${o.danger ? "btn-danger" : "btn-primary"}" value="ok">${o.confirm}</button></div>`,
    );
    document.body.append(d);
    d.addEventListener("click", (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>("button[value]");
      if (b) closeDialog(d, b.value);
    });
    d.addEventListener("close", () => {
      resolve(d.returnValue === "ok");
      d.remove();
    });
    openDialog(d);
  });
}

// ---- banners: under the top bar, inside the content column ----

export interface BannerOpts {
  icon: IconName;
  body: SafeHtml;
  actions?: SafeHtml;
  tone?: "error";
  /** Shows a dismiss button; hides for this many days (0 = this page only). */
  dismissDays?: number;
  live?: boolean;
}

const dismissKey = (id: string) => `myleet:banner:${id}`;

export function bannerDismissed(id: string): boolean {
  try {
    const until = Number(localStorage.getItem(dismissKey(id)) ?? 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function showBanner(id: string, o: BannerOpts): HTMLElement | null {
  const host = document.getElementById("banners");
  if (!host || bannerDismissed(id)) return null;
  let el = host.querySelector<HTMLElement>(`[data-banner="${id}"]`);
  if (!el) {
    el = document.createElement("div");
    el.dataset.banner = id;
    host.append(el);
  }
  el.className = `banner${o.tone === "error" ? " is-error" : ""}`;
  if (o.live) el.setAttribute("role", "status");
  render(
    el,
    html`${icon(o.icon)}<span class="banner-text">${o.body}</span><span class="banner-actions">${o.actions ?? ""}${
      o.dismissDays !== undefined ? html`<button class="icon-btn" data-dismiss aria-label="Dismiss">${icon("x")}</button>` : ""
    }</span>`,
  );
  el.querySelector("[data-dismiss]")?.addEventListener("click", () => {
    try {
      if (o.dismissDays) localStorage.setItem(dismissKey(id), String(Date.now() + o.dismissDays * 86_400_000));
    } catch {
      // Dismissal not remembered; it still hides now.
    }
    el?.remove();
  });
  return el;
}

export function hideBanner(id: string): void {
  document.querySelector(`#banners [data-banner="${id}"]`)?.remove();
}
