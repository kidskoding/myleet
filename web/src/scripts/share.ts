// "Share your progress": live card preview, what to show, light/dark, link, download, share.
import { cachedMe, type PublicProfile } from "../lib/account";
import { loadCatalog } from "../lib/catalog";
import { readEvents } from "../lib/progress";
import { profileHref, ROUTES } from "../lib/routes";
import { FLAVOR_NAMES, type Flavor } from "../lib/flavors";
import { readAccent, readNight, resolvedFlavor } from "../lib/prefs";
import { cardLabel, drawCard, type CardData } from "../lib/share-card";
import { loadTrainer } from "../lib/trainer";
import { html, render } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { closeDialog, openDialog } from "../lib/ui/overlay";

/** The owner's card from local progress: per-rung counts and strongest techniques included. */
export async function localCard(): Promise<CardData> {
  const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
  const me = cachedMe();
  const states = t.states(events);
  const stats = t.stats(events);
  const rungs = [0, 0, 0, 0, 0];
  const byTech = new Map<string, number>();
  for (const [id, s] of Object.entries(states)) {
    if (s.status === "unseen" || s.rung < 0) continue;
    rungs[Math.min(4, s.rung)] = (rungs[Math.min(4, s.rung)] ?? 0) + 1;
    if (s.status !== "mastered") continue;
    const p = cat.byId.get(id);
    const tech = p ? cat.catalog.modules[p.module]?.techniques[p.technique]?.title : undefined;
    if (tech) byTech.set(tech, (byTech.get(tech) ?? 0) + 1);
  }
  return {
    name: me?.user.display_name || me?.user.username || "My progress",
    username: me?.user.username ?? null,
    streak: stats.streak,
    mastered: stats.counts.mastered,
    strongest: [...byTech.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
    rungs,
  };
}

export function profileCard(p: PublicProfile): CardData {
  return {
    name: p.display_name || p.username,
    username: p.username,
    streak: p.summary?.streak ?? 0,
    mastered: p.summary?.mastered ?? 0,
    strongest: null,
    rungs: null,
  };
}

export async function openShare(opts: { profile?: PublicProfile } = {}): Promise<void> {
  const full = opts.profile ? profileCard(opts.profile) : await localCard();
  const show = { streak: true, mastered: true, strongest: true };
  const night = readNight();
  let theme: Flavor = resolvedFlavor() === "latte" ? "latte" : night;
  const username = full.username;
  const url = username ? new URL(profileHref(username), location.origin).href : null;

  const d = document.createElement("dialog");
  d.className = "dlg share";
  d.style.setProperty("--dlg-w", "720px");
  d.setAttribute("aria-labelledby", "sh-h");
  render(
    d,
    html`<div class="dlg-head"><h2 id="sh-h">Share your progress</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon("x")}</button></div>
    <div class="dlg-body">
      <canvas class="share-preview" role="img" width="1200" height="630"></canvas>
      <div class="share-controls">
        <label class="switch"><input type="checkbox" data-show="streak" checked />Streak</label>
        <label class="switch"><input type="checkbox" data-show="mastered" checked />Mastered count</label>
        ${full.strongest ? html`<label class="switch"><input type="checkbox" data-show="strongest" checked />Strongest techniques</label>` : ""}
        <div class="seg" role="group" aria-label="Card colours">${(["latte", night] as const).map((f) => html`<button type="button" data-theme-card="${f}" aria-pressed="${f === theme ? "true" : "false"}">${FLAVOR_NAMES[f]}</button>`)}</div>
      </div>
      ${url
        ? html`<div class="share-link"><label class="visually-hidden" for="sh-url">Profile link</label><input class="input" id="sh-url" readonly value="${url}" /><button class="btn btn-secondary" type="button" data-copy>Copy link</button><span class="visually-hidden" role="status" data-copied></span></div>`
        : html`<p class="fineprint" style="margin-top:var(--space-4)">Sign in and turn on your public profile in <a class="link" href="${ROUTES.settings}#privacy">Settings</a> to share a link. You can still download the image</p>`}
    </div>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-download>${icon("download")}Download image</button>${
      "share" in navigator ? html`<button class="btn btn-primary" type="button" data-share>${icon("share")}Share</button>` : ""
    }</div>`,
  );
  const canvas = d.querySelector("canvas") as HTMLCanvasElement;
  const data = (): CardData => ({
    ...full,
    streak: show.streak ? full.streak : null,
    mastered: show.mastered ? full.mastered : null,
    strongest: show.strongest ? full.strongest : null,
  });
  const paint = () => {
    drawCard(canvas, data(), theme, readAccent());
    canvas.setAttribute("aria-label", cardLabel(data()));
  };
  await document.fonts.load('700 64px "Archivo Variable"').catch(() => undefined);
  paint();

  d.addEventListener("change", (e) => {
    const k = (e.target as HTMLInputElement).dataset.show as keyof typeof show | undefined;
    if (k) {
      show[k] = (e.target as HTMLInputElement).checked;
      paint();
    }
  });
  d.addEventListener("click", async (e) => {
    const t = e.target as Element;
    const th = t.closest<HTMLElement>("[data-theme-card]");
    if (t.closest("[data-close]")) closeDialog(d);
    else if (th) {
      theme = th.dataset.themeCard as Flavor;
      d.querySelectorAll("[data-theme-card]").forEach((b) => b.setAttribute("aria-pressed", String(b === th)));
      paint();
    } else if (t.closest("[data-copy]") && url) {
      const b = t.closest<HTMLButtonElement>("[data-copy]") as HTMLButtonElement;
      await navigator.clipboard.writeText(url).catch(() => (d.querySelector<HTMLInputElement>("#sh-url")?.select(), undefined));
      b.textContent = "Copied";
      const live = d.querySelector("[data-copied]");
      if (live) live.textContent = "Link copied";
      setTimeout(() => {
        b.textContent = "Copy link";
        if (live) live.textContent = "";
      }, 2000);
    } else if (t.closest("[data-download]")) {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `myleet-${username ?? "progress"}.png`;
      a.click();
    } else if (t.closest("[data-share]")) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      const file = blob ? new File([blob], "myleet-progress.png", { type: "image/png" }) : null;
      const payload: ShareData = { title: `${full.name} on myleet`, ...(url ? { url } : {}) };
      if (file && navigator.canShare?.({ files: [file] })) payload.files = [file];
      await navigator.share(payload).catch(() => undefined);
    }
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  openDialog(d);
}
