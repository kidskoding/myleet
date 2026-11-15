// Notes-reader state: highlights, margin notes and reading progress per note.
// Local only (localStorage): account sync carries events.jsonl, not this.
// shortcut: device-local; move into the account sync once the Worker stores reader state.

const KEY = "myleet:notes";

export interface Annotation {
  id: string;
  /** Catalog note path, e.g. `curriculum/04_sliding_window/notes/02_variable_size_window.md`. */
  note: string;
  /** The highlighted text, plus up to 32 characters either side, to re-anchor after edits. */
  quote: string;
  prefix: string;
  suffix: string;
  /** Character offset of `quote` in the article's text when it was made. */
  start: number;
  /** The margin note; empty for a plain highlight. */
  text: string;
  created: number;
  updated: number;
}

export interface ReadState {
  /** Furthest scroll through the article, 0-1. */
  pct: number;
  read: boolean;
  at: number;
}

interface Store {
  annotations: Annotation[];
  reads: Record<string, ReadState>;
}

const CONTEXT = 32;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function load(): Store {
  try {
    const v = JSON.parse(storage()?.getItem(KEY) ?? "null") as Partial<Store> | null;
    return { annotations: Array.isArray(v?.annotations) ? v.annotations : [], reads: v?.reads ?? {} };
  } catch {
    return { annotations: [], reads: {} };
  }
}

/** Throws when storage is full or blocked so the reader can show "Not saved". */
function save(s: Store): void {
  const st = storage();
  if (!st) throw new Error("storage unavailable");
  st.setItem(KEY, JSON.stringify(s));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("myleet:notes"));
}

export const annotationsFor = (note: string): Annotation[] =>
  load()
    .annotations.filter((a) => a.note === note)
    .sort((a, b) => a.start - b.start);

/** Every highlight in the book, newest first (Progress lists them). */
export const allAnnotations = (): Annotation[] => load().annotations.sort((a, b) => b.updated - a.updated);

/** Builds an anchored annotation for `[start, end)` of the article text. */
export function makeAnnotation(note: string, text: string, start: number, end: number, now = Date.now()): Annotation {
  return {
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    note,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    start,
    text: "",
    created: now,
    updated: now,
  };
}

export function putAnnotation(a: Annotation): void {
  const s = load();
  const i = s.annotations.findIndex((x) => x.id === a.id);
  if (i >= 0) s.annotations[i] = a;
  else s.annotations.push(a);
  save(s);
}

export function removeAnnotation(id: string): Annotation | undefined {
  const s = load();
  const gone = s.annotations.find((a) => a.id === id);
  s.annotations = s.annotations.filter((a) => a.id !== id);
  save(s);
  return gone;
}

/**
 * Where an annotation sits in the current article text, or null when its quote is gone
 * ("detached"). Prefers the occurrence whose context matches, then the nearest to `start`.
 */
export function locate(a: Pick<Annotation, "quote" | "prefix" | "suffix" | "start">, text: string): [number, number] | null {
  if (!a.quote) return null;
  let best: { at: number; score: number } | null = null;
  for (let i = text.indexOf(a.quote); i >= 0; i = text.indexOf(a.quote, i + 1)) {
    const pre = text.slice(Math.max(0, i - a.prefix.length), i);
    const suf = text.slice(i + a.quote.length, i + a.quote.length + a.suffix.length);
    const score = (pre === a.prefix ? 2 : 0) + (suf === a.suffix ? 2 : 0) - Math.abs(i - a.start) / Math.max(1, text.length);
    if (!best || score > best.score) best = { at: i, score };
  }
  return best ? [best.at, best.at + a.quote.length] : null;
}

export const readState = (note: string): ReadState | undefined => load().reads[note];

export const allReads = (): Record<string, ReadState> => load().reads;

/** Records scroll progress (never moves backwards) and, optionally, read. */
export function markProgress(note: string, pct: number, read?: boolean, now = Date.now()): ReadState {
  const s = load();
  const old = s.reads[note];
  const next: ReadState = { pct: Math.max(old?.pct ?? 0, Math.min(1, pct)), read: read ?? old?.read ?? false, at: now };
  if (old && next.pct === old.pct && next.read === old.read) return old;
  s.reads[note] = next;
  try {
    save(s);
  } catch {
    // Reading progress is a convenience; losing it is fine.
  }
  return next;
}

/** Words left / 220 wpm, code at half speed. */
export function minutesLeft(proseWords: number, codeWords: number, pct: number): number {
  const total = proseWords / 220 + codeWords / 110;
  return Math.max(0, Math.ceil(total * (1 - pct)));
}
