import type { Diagnostic, Workspace } from "@astral-sh/ruff-wasm-web";

export type { Diagnostic };

// Same rules as the repo's pyproject.toml, so the browser agrees with CI.
const SETTINGS = {
  "line-length": 130,
  "target-version": "py312",
  lint: { select: ["E", "F", "I"] },
};

let workspace: Promise<Workspace> | undefined;

function ruff(): Promise<Workspace> {
  workspace ??= import("@astral-sh/ruff-wasm-web").then(async (m) => {
    await m.default();
    return new m.Workspace(SETTINGS, m.PositionEncoding.Utf16);
  });
  workspace.catch(() => (workspace = undefined));
  return workspace;
}

/** Rows are 1-based, columns 1-based UTF-16 units (ruff's convention). */
export async function lint(code: string): Promise<Diagnostic[]> {
  return (await ruff()).check(code) as Diagnostic[];
}

/** Throws on a syntax error, so callers keep the unformatted text. */
export async function format(code: string): Promise<string> {
  return (await ruff()).format(code);
}
