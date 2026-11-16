// Sign in / sign up (one dialog, also inline on /signin), "Keep your progress" merge,
// and sign out. Loaded on demand.
import { fetchProviders, rememberReturn, sendMagicLink, signInMethods, signOut, startOAuth, ApiError, type Me, type Providers } from "../lib/account";
import { safeNext } from "../lib/gate";
import { mergeEvents, readEvents, type RemoteProgress, type SyncTransport } from "../lib/progress";
import { ROUTES } from "../lib/routes";
import { sideSummary, type SideSummary } from "../lib/summary";
import { decideLater, discardDeviceAndPull, mergeIntoAccount, unlinkDevice } from "../lib/sync";
import { loadTrainer } from "../lib/trainer";
import { plural } from "../lib/ui/bits";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung, ladder, RUNG_DAYS } from "../lib/ui/ladder";
import { closeDialog, confirmDialog, openDialog, toast } from "../lib/ui/overlay";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type View =
  | { kind: "form"; error?: string; email?: string; waiting?: "github" | "google" }
  | { kind: "sent"; email: string }
  | { kind: "link-expired"; email?: string };

type Mode = "signup" | "signin";

interface Host {
  el: HTMLElement;
  inline: boolean;
  mode: Mode;
  providers: Providers;
  /** Where to land after signing in (the inline page's `?next=`). */
  next: string | null;
  close(): void;
}

const HAD_ACCOUNT = "myleet:had-account";

/** Sign-up copy for a first visit, "Welcome back" once this device has signed in. */
function defaultMode(): Mode {
  try {
    return localStorage.getItem(HAD_ACCOUNT) ? "signin" : "signup";
  } catch {
    return "signup";
  }
}

export function rememberAccount(): void {
  try {
    localStorage.setItem(HAD_ACCOUNT, "1");
  } catch {
    // Only the sign-in page's heading uses this.
  }
}

const COPY: Record<Mode, { title: string; sub: string; swap: string; swapTo: Mode }> = {
  signup: {
    title: "Create your free account",
    sub: "Your account keeps your study plan and your review dates, so each review shows up on the right day on any device you sign in from",
    swap: "Already have an account? Sign in",
    swapTo: "signin",
  },
  signin: {
    title: "Welcome back",
    sub: "Sign in to pick up your plan and today's reviews",
    swap: "New to myleet? Create a free account",
    swapTo: "signup",
  },
};

const providerName = { github: "GitHub", google: "Google" } as const;

function formView(h: Host, v: Extract<View, { kind: "form" }>): SafeHtml {
  const offline = !navigator.onLine;
  const busy = !!v.waiting || offline;
  const c = COPY[h.mode];
  const m = signInMethods(h.providers);
  const provider = (p: "github" | "google") =>
    html`<button class="btn btn-secondary provider" type="button" data-provider="${p}" ${busy ? "disabled" : ""} ${v.waiting === p ? html`aria-busy="true"` : ""}>${icon(p)}${
      v.waiting === p ? `Waiting for ${providerName[p]}` : `Continue with ${providerName[p]}`
    }${v.waiting === p ? html`<span class="spinner" aria-hidden="true"></span>` : ""}</button>`;
  const email = html`<form class="auth-stack" novalidate data-email-form>
        <div class="field">
          <label for="si-email">Email</label>
          <input class="input" id="si-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@school.edu" value="${v.email ?? ""}" ${busy ? "disabled" : ""} aria-describedby="si-email-err" />
          <p class="err" id="si-email-err" hidden></p>
        </div>
        <button class="btn btn-primary btn-lg" type="submit" ${busy ? "disabled" : ""}>Email me a sign-in link</button>
      </form>`;
  const none = !m.oauth.length && !m.email;
  return html`${h.inline ? "" : html`<button class="icon-btn auth-close" type="button" data-close aria-label="Close">${icon("x")}</button>`}
    ${h.inline ? html`<h1 id="si-h" tabindex="-1">${c.title}</h1>` : html`<h2 id="si-h" tabindex="-1">${c.title}</h2>`}
    <p class="auth-sub" id="si-d">${c.sub}</p>
    ${v.error ? html`<p class="auth-alert" role="alert">${icon("circle-alert")}<span>${v.error}</span></p>` : ""}
    ${offline ? html`<p class="auth-alert" role="status">${icon("wifi-off")}<span>You're offline. Sign in when you reconnect</span></p>` : ""}
    ${none ? html`<p class="auth-alert" role="status">${icon("circle-alert")}<span>Sign-in isn't set up on this copy of myleet yet</span></p>` : ""}
    <div class="auth-stack">
      ${m.oauth.map(provider)}
      ${m.email && m.oauth.length ? html`<div class="auth-or">or</div>` : ""}
      ${m.email ? email : ""}
    </div>
    <p class="auth-swap"><button class="btn btn-ghost btn-sm" type="button" data-swap>${c.swap}</button></p>
    <p class="auth-fine">${m.oauth.length ? "Signing up and signing in use the same buttons. " : ""}We store your email and your practice history, nothing else, and there are no passwords. <a class="link" href="${ROUTES.privacy}">Privacy</a></p>`;
}

function sentView(h: Host, v: Extract<View, { kind: "sent" }>): SafeHtml {
  return html`${h.inline ? "" : html`<button class="icon-btn auth-close" type="button" data-close aria-label="Close">${icon("x")}</button>`}
    <div class="big-icon">${icon("mail-check")}</div>
    <h2 id="si-h" tabindex="-1">Check your email</h2>
    <p class="auth-sub">We sent a sign-in link to <strong>${v.email}</strong>. It works once and expires in 15 minutes. You can close this tab; the link signs you in wherever you open it</p>
    <div class="auth-row"><button class="btn btn-secondary" type="button" data-resend disabled>Resend in 1:00</button><button class="btn btn-ghost" type="button" data-other-email>Use a different email</button></div>
    <p class="auth-fine">Nothing after a minute? Check spam or promotions, then resend</p>`;
}

function expiredView(h: Host): SafeHtml {
  return html`${h.inline ? "" : html`<button class="icon-btn auth-close" type="button" data-close aria-label="Close">${icon("x")}</button>`}
    <div class="big-icon bad">${icon("link-off")}</div>
    <h2 id="si-h" tabindex="-1">That sign-in link has expired</h2>
    <p class="auth-sub" id="si-d">Links work once and last 15 minutes. Send a new one, or sign in another way</p>
    <div class="auth-row"><button class="btn btn-primary" type="button" data-new-link>Send a new link</button>${
      signInMethods(h.providers).oauth.length ? html`<button class="btn btn-ghost" type="button" data-other-way>Sign in another way</button>` : ""
    }</div>`;
}

function mount(h: Host, view: View): void {
  const v = view;
  render(h.el, v.kind === "form" ? formView(h, v) : v.kind === "sent" ? sentView(h, v) : expiredView(h));
  const dlg = h.el.closest("dialog");
  if (dlg) dlg.setAttribute("role", v.kind === "link-expired" ? "alertdialog" : "dialog");
  h.el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => h.close()));
  if (!h.inline || v.kind !== "form") h.el.querySelector<HTMLElement>("#si-h")?.focus();

  if (v.kind === "form") {
    h.el.querySelector("[data-swap]")?.addEventListener("click", () => {
      h.mode = COPY[h.mode].swapTo;
      mount(h, { kind: "form" });
      h.el.querySelector<HTMLElement>("#si-h")?.focus();
    });
    for (const b of h.el.querySelectorAll<HTMLButtonElement>("[data-provider]")) {
      b.addEventListener("click", () => {
        const p = b.dataset.provider as "github" | "google";
        mount(h, { kind: "form", waiting: p });
        startOAuth(p, h.inline ? safeNext(h.next) : undefined);
      });
    }
    const form = h.el.querySelector<HTMLFormElement>("[data-email-form]");
    const input = h.el.querySelector<HTMLInputElement>("#si-email");
    const err = h.el.querySelector<HTMLElement>("#si-email-err");
    const invalid = (msg: string | null) => {
      if (!input || !err) return;
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      err.hidden = !msg;
      err.textContent = msg ?? "";
    };
    const check = () => {
      const ok = EMAIL_RE.test(input?.value.trim() ?? "");
      invalid(ok ? null : "Enter an email like name@school.edu");
      return ok;
    };
    input?.addEventListener("blur", () => input.value.trim() && check());
    if (h.inline && !v.error) input?.focus();
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!input || !check()) return input?.focus();
      const email = input.value.trim();
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (btn) {
        btn.setAttribute("aria-busy", "true");
        btn.textContent = "Sending link";
      }
      try {
        rememberReturn(h.inline ? safeNext(h.next) : location.pathname + location.search);
        await sendMagicLink(email);
        mount(h, { kind: "sent", email });
      } catch (e2) {
        const msg =
          e2 instanceof ApiError && e2.status === 429
            ? "Too many links for this address in the last hour. Try GitHub or Google, or wait a bit"
            : e2 instanceof ApiError && e2.status === 404
              ? "Sign-in isn't available on this copy of myleet"
              : "Couldn't send the link. Check your connection and try again";
        mount(h, { kind: "form", email, error: msg });
      }
    });
  } else if (v.kind === "sent") {
    const resend = h.el.querySelector<HTMLButtonElement>("[data-resend]");
    let left = 60;
    const tick = setInterval(() => {
      left -= 1;
      if (!resend?.isConnected) return clearInterval(tick);
      if (left <= 0) {
        clearInterval(tick);
        resend.disabled = false;
        resend.textContent = "Resend link";
      } else resend.textContent = `Resend in 0:${String(left).padStart(2, "0")}`;
    }, 1000);
    resend?.addEventListener("click", async () => {
      resend.setAttribute("aria-busy", "true");
      try {
        await sendMagicLink(v.email);
        toast(`Sent another link to ${v.email}`);
        mount(h, v);
      } catch {
        mount(h, { kind: "form", email: v.email, error: "Couldn't send the link. Check your connection and try again" });
      }
    });
    h.el.querySelector("[data-other-email]")?.addEventListener("click", () => mount(h, { kind: "form" }));
  } else {
    h.el.querySelector("[data-new-link]")?.addEventListener("click", () => {
      mount(h, v.email ? { kind: "form", email: v.email } : { kind: "form" });
      h.el.querySelector<HTMLInputElement>("#si-email")?.focus();
    });
    h.el.querySelector("[data-other-way]")?.addEventListener("click", () => mount(h, { kind: "form" }));
  }
}

let dlg: HTMLDialogElement | undefined;

/** Opens the sign-in dialog; `error` is a provider or link failure from `?auth_error=`. */
export async function openSignIn(opts: { error?: string } = {}): Promise<void> {
  const providers = await fetchProviders();
  if (!dlg?.isConnected) {
    dlg = document.createElement("dialog");
    dlg.className = "dlg auth";
    dlg.setAttribute("aria-labelledby", "si-h");
    dlg.setAttribute("aria-describedby", "si-d");
    dlg.innerHTML = '<div class="auth-panel"></div>';
    document.body.append(dlg);
  }
  const d = dlg;
  const el = d.querySelector<HTMLElement>(".auth-panel") as HTMLElement;
  const host: Host = { el, inline: false, mode: defaultMode(), providers, next: null, close: () => closeDialog(d) };
  const link = opts.error?.startsWith("That sign-in link");
  mount(host, link ? { kind: "link-expired" } : opts.error ? { kind: "form", error: opts.error } : { kind: "form" });
  openDialog(d);
  d.querySelector<HTMLElement>("#si-h")?.focus();
}

/** The `/signin` fallback page renders the same panel inline. */
export async function mountSignInPage(el: HTMLElement, error?: string): Promise<void> {
  const q = new URLSearchParams(location.search);
  const mode = q.get("mode");
  const host: Host = {
    el,
    inline: true,
    mode: mode === "signup" || mode === "signin" ? mode : defaultMode(),
    providers: await fetchProviders(),
    next: q.get("next"),
    close: () => location.assign(safeNext(q.get("next"))),
  };
  const link = error?.startsWith("That sign-in link");
  mount(host, link ? { kind: "link-expired" } : error ? { kind: "form", error } : { kind: "form" });
}

export async function signOutFlow(): Promise<void> {
  try {
    await signOut();
  } catch {
    // The cookie may already be gone; local sign-out still happens.
  }
  unlinkDevice();
  // An account page has nothing to show once signed out.
  if (document.documentElement.hasAttribute("data-gated")) return location.assign(ROUTES.home);
  document.documentElement.dataset.auth = "out";
  window.dispatchEvent(new CustomEvent("myleet:auth", { detail: null }));
  toast("Signed out");
}

const ago = (ms: number | null, other: boolean): string => {
  if (ms === null) return "No practice yet";
  const d = new Date(ms);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const when = same ? "today" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Last practiced ${when}${other ? ", on another device" : ""}`;
};

const side = (id: string, ic: "laptop" | "cloud", title: string, s: SideSummary, other: boolean) =>
  html`<section class="merge-side" aria-labelledby="${id}"><h3 id="${id}">${icon(ic)}${title}</h3>
    <dl><dt>${s.practised}</dt><dd>problems practiced</dd><dt>${s.mastered}</dt><dd>mastered</dd><dt>${s.streak}</dt><dd>day streak</dd></dl>
    <p class="when">${ago(s.lastMs, other)}</p></section>`;

export async function openMerge(me: Me, remote: RemoteProgress, transport: SyncTransport): Promise<void> {
  const [t, local] = await Promise.all([loadTrainer(), readEvents()]);
  const merged = mergeEvents(local, remote.events_jsonl);
  const dev = sideSummary(t, local);
  const acc = sideSummary(t, remote.events_jsonl);
  const after = sideSummary(t, merged);
  const ds = t.states(local);
  const as = t.states(remote.events_jsonl);
  const ms = t.states(merged);
  const { byId } = await import("../lib/catalog").then((m) => m.loadCatalog());
  const both = Object.keys(ds).filter((id) => as[id] && ds[id]?.status !== "unseen" && as[id]?.status !== "unseen");
  const kept = (id: string) => {
    const r = displayRung(ms[id]?.rung ?? -1);
    return r ? `${RUNG_DAYS[r - 1]} days` : "Not started";
  };

  const d = document.createElement("dialog");
  d.className = "dlg auth";
  d.style.setProperty("--dlg-w", "720px");
  d.setAttribute("aria-labelledby", "mg-h");
  d.setAttribute("aria-describedby", "mg-d");
  const body = (error?: string) =>
    html`<div class="auth-panel">
      <h2 id="mg-h" tabindex="-1">Keep your progress</h2>
      <p class="auth-sub" id="mg-d">You practiced on this device before signing in, and your account already has progress from another device. Merging keeps both</p>
      <div class="sides">${side("dev-h", "laptop", "This device", dev, false)}<div class="plus" aria-hidden="true">${icon("plus")}</div>${side("acc-h", "cloud", me.user.email, acc, true)}</div>
      <p class="result-line">After merging: <strong>${plural(after.practised, "problem")}, ${after.mastered} mastered</strong> Where both have the same problem, the higher rung wins and both histories are kept. The streak counts every day you practiced on either</p>
      ${both.length
        ? html`<details class="overlap"><summary>See the ${plural(both.length, "problem")} on both</summary>
          <table class="otable"><thead><tr><th scope="col">Problem</th><th scope="col">This device</th><th scope="col">Account</th><th scope="col">Kept</th></tr></thead>
          <tbody>${both.slice(0, 60).map(
            (id) =>
              html`<tr><td>${byId.get(id)?.title ?? id}</td><td>${ladder({ rung: displayRung(ds[id]?.rung ?? -1) })}</td><td>${ladder({ rung: displayRung(as[id]?.rung ?? -1) })}</td><td>${kept(id)}</td></tr>`,
          )}</tbody></table></details>`
        : ""}
      ${error ? html`<p class="auth-alert" role="alert">${icon("circle-alert")}<span>${error}</span></p>` : ""}
      <div class="merge-actions">
        <button class="btn btn-primary btn-lg" type="button" data-merge>Merge into my account</button>
        <button class="btn btn-ghost" type="button" data-later>Decide later</button>
        <span class="spacer"></span>
        <button class="btn btn-quiet-danger btn-sm" type="button" data-discard>Use account only, discard this device</button>
      </div></div>`;
  const wire = () => {
    d.querySelector("[data-merge]")?.addEventListener("click", async (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      b.setAttribute("aria-busy", "true");
      try {
        await mergeIntoAccount(transport, me.user.id);
        render(
          d,
          html`<div class="auth-panel"><div class="big-icon ok">${icon("check")}</div><h2 id="mg-h" tabindex="-1">Progress merged</h2>
            <p class="auth-sub">${plural(after.practised, "problem")} and ${after.mastered} mastered are on your account now. This device syncs automatically, and keeps working offline</p>
            <div class="auth-row"><button class="btn btn-primary" type="button" data-done>Back to practice</button></div></div>`,
        );
        d.querySelector<HTMLElement>("#mg-h")?.focus();
        d.querySelector("[data-done]")?.addEventListener("click", () => closeDialog(d));
        window.dispatchEvent(new Event("myleet:synced"));
      } catch {
        render(d, body("Couldn't reach the server. Nothing was changed; try again"));
        wire();
      }
    });
    d.querySelector("[data-later]")?.addEventListener("click", () => {
      decideLater(me.user.id);
      closeDialog(d);
    });
    d.querySelector("[data-discard]")?.addEventListener("click", async () => {
      const ok = await confirmDialog({
        title: `Discard ${plural(dev.practised, "problem")} on this device?`,
        body: "This device will show only your account's progress and highlights. This can't be undone",
        confirm: "Use account only, discard this device",
        danger: true,
      });
      if (!ok) return;
      try {
        await discardDeviceAndPull(transport, me.user.id);
        closeDialog(d);
        toast("This device now shows your account's progress");
        window.dispatchEvent(new Event("myleet:synced"));
      } catch {
        render(d, body("Couldn't reach the server. Nothing was changed; try again"));
        wire();
      }
    });
  };
  render(d, body());
  wire();
  // Esc means "Decide later" here, never a silent merge.
  d.addEventListener("cancel", () => decideLater(me.user.id));
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  openDialog(d);
  d.querySelector<HTMLElement>("#mg-h")?.focus();
}

