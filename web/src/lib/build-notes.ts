// Build-time only: note text from the exported catalog, and reading-time estimates.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const noteText = (path: string): string => readFileSync(join(process.cwd(), "public/data/notes", path), "utf8");

/** Prose words and words inside fenced code blocks. */
export function noteWords(md: string): { prose: number; code: number } {
  let prose = 0;
  let code = 0;
  for (const [i, part] of md.split(/^```.*$/m).entries()) {
    const n = part.split(/\s+/).filter(Boolean).length;
    if (i % 2) code += n;
    else prose += n;
  }
  return { prose, code };
}

/** 220 wpm for prose, half speed for code. */
export function noteMinutes(path: string): number {
  const w = noteWords(noteText(path));
  return Math.max(1, Math.ceil(w.prose / 220 + w.code / 110));
}
