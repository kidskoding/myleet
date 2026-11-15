/// <reference lib="webworker" />
// ruff (lint + format) off the main thread, so typing never waits on it.
import { format, lint } from "../runner/ruff";

declare const self: DedicatedWorkerGlobalScope;

type Req = { id: number; op: "lint" | "format"; code: string };

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, op, code } = e.data;
  try {
    const value = op === "lint" ? await lint(code) : await format(code);
    self.postMessage({ id, ok: true, value });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
