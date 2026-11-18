// The "Connect your LeetCode" panel, shared by onboarding and Settings. It reads only the
// public profile; there is no login field and nothing here asks for one.
import { requireAccount } from "../access";
import { connect, current, disconnect, lastSynced, refresh, takeSummary } from "../leetcode";
import { ago } from "./calendar-sync";
import { readPrefs } from "../prefs";
import type { LeetcodeImport } from "../types";
import { html, render } from "./html";
import { toast } from "./overlay";

export interface PanelOptions {
  /** Onboarding: a Skip button that leaves the step without connecting. */
  onSkip?: () => void;
  /** Called after a successful connect, so onboarding can move on. */
  onConnected?: () => void;
}

const top = (i: LeetcodeImport) =>
  [...i.modules]
    .filter((m) => m.solved > 0)
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 4);

export function mountLeetcodePanel(host: HTMLElement, opts: PanelOptions = {}): void {
  let busy = false;
  let error = "";
  let summary: string | null = takeSummary();
  let info: LeetcodeImport | null = null;

  const paint = () => {
    const user = readPrefs().leetcodeUsername;
    if (user && info) {
      const mods = top(info);
      const at = lastSynced();
      const synced = busy ? "" : at ? ago(at) : "";
      render(
        host,
        html`<div class="lc">
          ${summary ? html`<p class="lc-summary" role="status">${summary}</p>` : ""}
          <p class="lc-who"><strong>${info.username}</strong> is connected, with ${info.total} problems solved on LeetCode</p>
          ${mods.length ? html`<ul class="lc-mods">${mods.map((m) => html`<li><span>${m.title}</span><b>${m.solved}</b></li>`)}</ul>` : ""}
          <p class="lc-note">${info.marked ? `${info.marked} recent problems are marked "solved on LeetCode" and will come back as reviews` : "Your plan starts with the topics you've done least"}</p>
          <p class="lc-note" data-lc-synced>New solves on LeetCode show up here on their own, within the hour while myleet is open and within a few hours when it isn't${synced ? `. Last checked ${synced}` : ""}</p>
          ${error ? html`<p class="err" role="alert">${error}</p>` : ""}
          <div class="lc-actions">
            <button class="btn btn-ghost btn-sm" type="button" data-lc-refresh ${busy ? "disabled" : ""}>${busy ? "Checking" : "Check now"}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-lc-disconnect ${busy ? "disabled" : ""}>Disconnect</button>
          </div>
        </div>`,
      );
      return;
    }
    render(
      host,
      html`<form class="lc" data-lc-form novalidate>
        <label class="lc-label" for="lc-user">LeetCode username</label>
        <div class="lc-row">
          <input id="lc-user" class="input" name="username" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="kidskoding" aria-describedby="lc-help lc-err" value="${user ?? ""}" />
          <button class="btn btn-primary" type="submit" ${busy ? "disabled" : ""}>${busy ? "Connecting" : "Connect"}</button>
          ${opts.onSkip ? html`<button class="btn btn-ghost" type="button" data-lc-skip>Skip</button>` : ""}
        </div>
        <p class="lc-help" id="lc-help">We only read your public profile: solved counts, topics and recent accepted problems. After this it stays in sync on its own. We never ask for your password or a login, and you can disconnect any time</p>
        <p class="err" id="lc-err" role="alert" ${error ? "" : "hidden"}>${error}</p>
      </form>`,
    );
  };

  const load = async () => {
    info = readPrefs().leetcodeUsername ? await current().catch(() => null) : null;
    paint();
  };

  host.addEventListener("submit", (e) => {
    const form = (e.target as Element).closest<HTMLFormElement>("[data-lc-form]");
    if (!form) return;
    e.preventDefault();
    if (busy || !requireAccount("leetcode-import")) return;
    busy = true;
    error = "";
    const name = String(new FormData(form).get("username") ?? "");
    paint();
    void connect(name).then(async (r) => {
      busy = false;
      if (!r.ok) {
        error = r.message;
        return paint();
      }
      summary = r.summary;
      await load();
      opts.onConnected?.();
    });
  });

  host.addEventListener("click", (e) => {
    const t = e.target as Element;
    if (t.closest("[data-lc-skip]")) opts.onSkip?.();
    else if (t.closest("[data-lc-refresh]") && !busy) {
      busy = true;
      error = "";
      paint();
      void refresh().then(async (r) => {
        busy = false;
        if (!r.ok) error = r.message;
        else toast(r.marked ? `Picked up ${r.marked === 1 ? "1 new solve" : `${r.marked} new solves`} from LeetCode` : "LeetCode is up to date");
        await load();
      });
    } else if (t.closest("[data-lc-disconnect]") && !busy) {
      busy = true;
      paint();
      void disconnect().then(() => {
        busy = false;
        info = null;
        summary = null;
        paint();
        toast("LeetCode disconnected");
      });
    }
  });

  void load();
}
