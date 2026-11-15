import type { Completion, LoadStage, Position, RunInput, RunResult, Signature } from "./types";

export type Request =
  | { id: number; type: "init"; indexURL: string; lib: Record<string, string> }
  | { id: number; type: "run"; input: RunInput }
  | { id: number; type: "complete"; pos: Position }
  | { id: number; type: "hover"; pos: Position }
  | { id: number; type: "signatures"; pos: Position };

export interface Replies {
  init: null;
  run: RunResult;
  complete: Completion[];
  hover: string;
  signatures: Signature[];
}

export type Response =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string }
  | { id: -1; progress: LoadStage };
