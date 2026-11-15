// Real download progress for the first Python load. The runner's worker reports stages
// only, so the page streams Pyodide's two big files itself, just before the worker asks
// for them; the browser's HTTP cache then serves the worker's identical requests.

/** Uncompressed sizes for the pinned Pyodide (runner PYODIDE_VERSION 314.0.7). */
// shortcut: hard-coded for the pinned version; update with PYODIDE_VERSION.
export const PYODIDE_FILES: readonly (readonly [string, number])[] = [
  ["pyodide.asm.wasm", 9_598_218],
  ["python_stdlib.zip", 2_545_637],
];

export const PYODIDE_BYTES = PYODIDE_FILES.reduce((n, [, b]) => n + b, 0);

export async function prefetchPyodide(base: string, onBytes: (done: number, total: number) => void): Promise<void> {
  const got = new Map<string, number>();
  const report = () => onBytes([...got.values()].reduce((a, b) => a + b, 0), PYODIDE_BYTES);
  await Promise.all(
    PYODIDE_FILES.map(async ([name]) => {
      try {
        const res = await fetch(`${base}${name}`);
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        let n = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          n += value.byteLength;
          got.set(name, n);
          report();
        }
      } catch {
        // Offline or blocked: the worker's own load reports the failure.
      }
    }),
  );
}
