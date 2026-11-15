// Landing: the scripted demo run (no Python on this page) and the late redirect for
// learners whose only trace is progress in IndexedDB.

const STAGGER_MS = 70;
const FIRST_MS = 350;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset["motion"] === "reduce";

/** Anyone with local events goes to Today; the inline head check covers the localStorage flags. */
function redirectIfReturning(): void {
  if (typeof indexedDB === "undefined") return;
  const open = indexedDB.open("myleet", 1);
  open.onupgradeneeded = () => open.result.createObjectStore("kv");
  open.onsuccess = () => {
    const db = open.result;
    try {
      const get = db.transaction("kv", "readonly").objectStore("kv").get("events");
      get.onsuccess = () => {
        db.close();
        if (typeof get.result === "string" && get.result.trim()) location.replace("/app");
      };
    } catch {
      db.close();
    }
  };
}

function setupDemo(demo: HTMLElement): void {
  const rows = [...demo.querySelectorAll<HTMLElement>(".trow")];
  const sum = demo.querySelector<HTMLElement>("[data-sum]");
  const btn = demo.querySelector<HTMLButtonElement>("[data-run]");
  const label = demo.querySelector<HTMLElement>("[data-run-label]");
  const kbd = demo.querySelector<HTMLElement>("[data-run-kbd]");
  if (!sum || !btn || !label) return;
  if (kbd) kbd.textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘↵" : "Ctrl ↵";
  let timers: ReturnType<typeof setTimeout>[] = [];

  const finish = () => {
    demo.dataset["state"] = "ran";
    demo.classList.add("climbed");
    sum.textContent = `${rows.length} of ${rows.length} passed`;
    const next = demo.querySelector("[data-next]");
    if (next) next.textContent = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    label.textContent = "Run again";
    btn.disabled = false;
  };
  const run = () => {
    if (btn.disabled) return;
    timers.forEach(clearTimeout);
    timers = [];
    demo.classList.remove("climbed");
    rows.forEach((r) => r.classList.remove("is-done"));
    if (reduced()) return finish();
    btn.disabled = true;
    demo.dataset["state"] = "run";
    sum.textContent = "Running 6 tests";
    rows.forEach((r, i) =>
      timers.push(
        setTimeout(() => {
          r.classList.add("is-done");
          if (i === rows.length - 1) timers.push(setTimeout(finish, 160));
        }, FIRST_MS + i * STAGGER_MS),
      ),
    );
  };
  btn.addEventListener("click", run);
  const onKey = (e: KeyboardEvent) => {
    if (!document.contains(demo)) return document.removeEventListener("keydown", onKey);
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };
  document.addEventListener("keydown", onKey);
}

document.addEventListener("astro:page-load", () => {
  const demo = document.querySelector<HTMLElement>("[data-landing] #demo");
  if (!demo) return;
  redirectIfReturning();
  setupDemo(demo);
});
