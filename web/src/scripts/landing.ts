// Landing: the live demo (no Python on this page). On a loop, the solution types itself into the
// editor, Run tests fires, the tests tick green one by one and the ladder climbs from 3 to 7 days.
// Under reduced motion the finished state shows, still. The loop pauses off screen and in a hidden tab.

const CHAR_MS = 34;
const LINE_MS = 140;
const TICK_MS = 150;
const HOLD_MS = 4200;
const START_SECS = 4 * 60 + 52;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset["motion"] === "reduce";
const clockText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function setupDemo(demo: HTMLElement): void {
  const rows = [...demo.querySelectorAll<HTMLElement>(".trow")];
  const lines = [...demo.querySelectorAll<HTMLElement>(".editor li")];
  const sum = demo.querySelector<HTMLElement>("[data-sum]");
  const btn = demo.querySelector<HTMLButtonElement>("[data-run]");
  const label = demo.querySelector<HTMLElement>("[data-run-label]");
  const kbd = demo.querySelector<HTMLElement>("[data-run-kbd]");
  const clock = demo.querySelector<HTMLElement>("[data-clock]");
  const track = demo.querySelector<HTMLElement>("[data-track]");
  const took = demo.querySelector<HTMLElement>("[data-took]");
  if (!sum || !btn || !label) return;
  if (kbd) kbd.textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘↵" : "Ctrl ↵";
  const code = lines.map((li) => {
    const text = li.querySelector("span")?.textContent ?? "";
    return { li, len: text.length, indent: text.length - text.trimStart().length };
  });

  let timers: ReturnType<typeof setTimeout>[] = [];
  let secs = START_SECS;
  let running = false;
  let visible = true;
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const setClock = () => {
    if (clock) clock.textContent = clockText(secs);
    if (track) track.style.width = `${Math.min(100, (secs / 900) * 100)}%`;
  };
  const showAll = () => {
    demo.classList.remove("typing");
    for (const c of code) c.li.classList.remove("is-typing");
  };

  const finish = () => {
    showAll();
    demo.dataset["state"] = "ran";
    demo.classList.add("climbed");
    sum.textContent = `${rows.length}/${rows.length} passed`;
    if (took) took.textContent = clockText(secs);
    const next = demo.querySelector("[data-next]");
    if (next) next.textContent = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    label.textContent = "Run again";
    btn.disabled = false;
    btn.classList.remove("is-pressed");
    running = false;
  };

  const runTests = () => {
    running = true;
    btn.disabled = true;
    demo.dataset["state"] = "run";
    sum.textContent = `Running ${rows.length} tests`;
    rows.forEach((r, i) =>
      later(() => {
        r.classList.add("is-done");
        if (i === rows.length - 1) later(() => (finish(), loop()), 200);
      }, 320 + i * TICK_MS),
    );
  };

  const reset = () => {
    stop();
    showAll();
    btn.classList.remove("is-pressed");
    demo.classList.remove("climbed");
    rows.forEach((r) => r.classList.remove("is-done"));
    demo.dataset["state"] = "idle";
    sum.textContent = `${rows.length} tests`;
    label.textContent = "Run tests";
  };

  // Types the solution line by line (indentation arrives at once, like an editor), then presses Run.
  const type = () => {
    reset();
    secs = START_SECS;
    setClock();
    demo.classList.add("typing");
    for (const c of code) c.li.style.setProperty("--n", "0");
    let at = 200;
    code.forEach((c, i) => {
      later(() => {
        code.forEach((o, j) => o.li.classList.toggle("is-typing", j === i));
        c.li.style.setProperty("--n", String(c.indent));
      }, at);
      for (let n = c.indent + 1; n <= c.len; n++) later(() => c.li.style.setProperty("--n", String(n)), (at += CHAR_MS));
      at += LINE_MS;
      later(() => ((secs += 3), setClock()), at);
    });
    later(() => showAll(), at + 200);
    later(() => btn.classList.add("is-pressed"), at + 700);
    later(runTests, at + 860);
  };

  // After a hold on the finished state, start over (only while the demo is on screen and the tab is open).
  const loop = () => later(() => (visible && !document.hidden ? type() : (pending = true)), HOLD_MS);
  let pending = false;

  const run = () => {
    if (running) return;
    reset();
    if (reduced()) return finish();
    runTests();
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

  document.addEventListener("astro:before-swap", stop, { once: true });
  if (reduced()) return finish();
  const resume = () => {
    if (pending && visible && !document.hidden) {
      pending = false;
      type();
    }
  };
  new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    resume();
  }).observe(demo);
  document.addEventListener("visibilitychange", resume);
  type();
}

document.addEventListener("astro:page-load", () => {
  const demo = document.querySelector<HTMLElement>("[data-landing] #demo");
  if (!demo) return;
  setupDemo(demo);
});
