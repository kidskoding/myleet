/// <reference lib="webworker" />
import type { PyodideAPI } from "pyodide";
import { bootPython, complete, hover, runTests, signatures } from "./engine";
import type { Request, Response } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

let py: Promise<PyodideAPI> | undefined;

const post = (r: Response) => self.postMessage(r);

async function boot(indexURL: string, lib: Record<string, string>): Promise<PyodideAPI> {
  post({ id: -1, progress: "pyodide" });
  const { loadPyodide } = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as typeof import("pyodide");
  const p = await loadPyodide({ indexURL });
  post({ id: -1, progress: "pytest" });
  await bootPython(p, lib);
  post({ id: -1, progress: "ready" });
  return p;
}

async function handle(m: Request): Promise<unknown> {
  if (m.type === "init") {
    py ??= boot(m.indexURL, m.lib);
    py.catch(() => (py = undefined));
    await py;
    return null;
  }
  if (!py) throw new Error("runner not initialized");
  const p = await py;
  switch (m.type) {
    case "run":
      return runTests(p, m.input.test, m.input.code);
    case "complete":
      return complete(p, m.pos);
    case "hover":
      return hover(p, m.pos);
    case "signatures":
      return signatures(p, m.pos);
  }
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const m = e.data;
  try {
    post({ id: m.id, ok: true, value: await handle(m) });
  } catch (err) {
    post({ id: m.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
