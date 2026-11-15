// ruff (lint + `ruff format`) in its own worker, started on first use.

import type { Diagnostic } from "@astral-sh/ruff-wasm-web";

export interface RuffApi {
  lint(code: string): Promise<Diagnostic[]>;
  format(code: string): Promise<string>;
}

/** One lazily started worker per page. */
export function ruffWorker(): RuffApi {
  let worker: Worker | undefined;
  let next = 0;
  const pending = new Map<number, { res(v: unknown): void; rej(e: Error): void }>();
  const call = <T>(op: "lint" | "format", code: string) =>
    new Promise<T>((res, rej) => {
      if (!worker) {
        worker = new Worker(new URL("./ruff.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; value?: unknown; error?: string }>) => {
          const p = pending.get(e.data.id);
          pending.delete(e.data.id);
          if (e.data.ok) p?.res(e.data.value);
          else p?.rej(new Error(e.data.error ?? "ruff failed"));
        };
        worker.onerror = (e) => {
          for (const p of pending.values()) p.rej(new Error(e.message || "ruff worker crashed"));
          pending.clear();
          worker = undefined;
        };
      }
      const id = next++;
      pending.set(id, { res: res as (v: unknown) => void, rej });
      worker.postMessage({ id, op, code });
    });
  return { lint: (c) => call<Diagnostic[]>("lint", c), format: (c) => call<string>("format", c) };
}
