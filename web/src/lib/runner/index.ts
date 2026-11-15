import type { Replies, Request, Response } from "./protocol";
import type { Completion, LoadProgress, Position, RunInput, RunResult, Signature } from "./types";

export * from "./types";
export { format, lint, type Diagnostic } from "./ruff";

export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
/** The CLI's default (`src/config.rs`). */
export const DEFAULT_TIMEOUT_MS = 10_000;

export interface RunnerOptions {
  timeoutMs?: number;
  /** Called through the first load (and again after a timeout restarts Python). */
  onProgress?: (p: LoadProgress) => void;
  indexURL?: string;
}

type Pending = { resolve(v: unknown): void; reject(e: Error): void };
type Body = Request extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

let libPromise: Promise<Record<string, string>> | undefined;

function loadLib(): Promise<Record<string, string>> {
  libPromise ??= fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/runner-lib.json`).then((r) => {
    if (!r.ok) throw new Error(`runner-lib.json: ${r.status}`);
    return r.json() as Promise<Record<string, string>>;
  });
  libPromise.catch(() => (libPromise = undefined));
  return libPromise;
}

/**
 * Pyodide + pytest in a Web Worker. A run past the timeout terminates the worker
 * (the only way to stop a busy Python loop without SharedArrayBuffer) and starts a fresh one.
 */
export class TestRunner {
  private worker: Worker | undefined;
  private ready: Promise<void> | undefined;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private bootStart = 0;
  private readonly timeoutMs: number;
  private readonly indexURL: string;

  constructor(private readonly opts: RunnerOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.indexURL = opts.indexURL ?? PYODIDE_URL;
  }

  /** Starts loading Python now; every call awaits this anyway. */
  load(): Promise<void> {
    this.ready ??= (async () => {
      const lib = await loadLib();
      this.bootStart = performance.now();
      await this.send({ type: "init", indexURL: this.indexURL, lib });
    })();
    this.ready.catch(() => this.restart());
    return this.ready;
  }

  async run(input: RunInput): Promise<RunResult> {
    await this.load();
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<"timeout">((res) => (timer = setTimeout(() => res("timeout"), this.timeoutMs)));
    const result = await Promise.race([this.send({ type: "run", input }), timedOut]);
    clearTimeout(timer);
    if (result === "timeout") {
      this.restart();
      void this.load();
      return {
        tests: [],
        passed: 0,
        total: 0,
        notStarted: false,
        timedOut: true,
        error: null,
        output: "",
        durationMs: performance.now() - start,
      };
    }
    return { ...result, durationMs: performance.now() - start };
  }

  async complete(pos: Position): Promise<Completion[]> {
    await this.load();
    return this.send({ type: "complete", pos });
  }

  async hover(pos: Position): Promise<string> {
    await this.load();
    return this.send({ type: "hover", pos });
  }

  async signatures(pos: Position): Promise<Signature[]> {
    await this.load();
    return this.send({ type: "signatures", pos });
  }

  dispose(): void {
    this.restart();
  }

  private restart(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    for (const p of this.pending.values()) p.reject(new Error("runner restarted"));
    this.pending.clear();
  }

  private spawn(): Worker {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<Response>) => {
      const m = e.data;
      if ("progress" in m) {
        this.opts.onProgress?.({ stage: m.progress, elapsedMs: performance.now() - this.bootStart });
        return;
      }
      const p = this.pending.get(m.id);
      this.pending.delete(m.id);
      if (m.ok) p?.resolve(m.value);
      else p?.reject(new Error(m.error));
    };
    w.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || "runner worker crashed"));
      this.pending.clear();
    };
    return w;
  }

  private send<K extends Request["type"]>(body: Extract<Body, { type: K }>): Promise<Replies[K]> {
    this.worker ??= this.spawn();
    const id = this.nextId++;
    const worker = this.worker;
    return new Promise<Replies[K]>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ ...body, id } as Request);
    });
  }
}

let shared: TestRunner | undefined;

/** One runner per page, so Python loads once. */
export function getRunner(opts?: RunnerOptions): TestRunner {
  shared ??= new TestRunner(opts);
  return shared;
}
