// Notes-reader state: highlights, margin notes and reading progress per note.
// Local-first (localStorage). When signed in, lib/progress.ts carries it to the account
// as `notes_json` on the progress row; merges go by id and `updated`, and removals are
// tombstones so a merge never brings a deleted highlight back.

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
  /** Tombstone: removed on some device. Kept so merges don't resurrect it. */
  deleted?: true;
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
  /** Changed since the account last took a copy; absent in stores from before sync. */
  dirty?: boolean;
}

/** The Worker's cap on `notes_json`; a bigger store stays on this device. */
export const MAX_NOTES_BYTES = 150_000;
// shortcut: tombstones older than this are dropped from the synced copy, so a device
// offline longer than that can bring a removed highlight back; keep them forever if that bites.
const TOMBSTONE_MS = 180 * 86_400_000;

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
    return { annotations: Array.isArray(v?.annotations) ? v.annotations : [], reads: v?.reads ?? {}, ...(v?.dirty !== undefined ? { dirty: v.dirty } : {}) };
  } catch {
    return { annotations: [], reads: {} };
  }
}

/**
 * Throws when storage is full or blocked so the reader can show "Not saved". A local
 * change marks the store for the next sync; `remote` (a merge from the account) doesn't.
 */
function save(s: Store, remote = false): void {
  const st = storage();
  if (!st) throw new Error("storage unavailable");
  st.setItem(KEY, JSON.stringify(remote ? s : { ...s, dirty: true }));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("myleet:notes", { detail: { remote } }));
}

const live = (a: Annotation) => !a.deleted;

export const annotationsFor = (note: string): Annotation[] =>
  load()
    .annotations.filter((a) => a.note === note && live(a))
    .sort((a, b) => a.start - b.start);

/** Every highlight in the book, newest first (Progress lists them). */
export const allAnnotations = (): Annotation[] => load().annotations.filter(live).sort((a, b) => b.updated - a.updated);

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

/** Saves `a`, stamped as the newest version so it wins a merge (an Undo beats its tombstone). */
export function putAnnotation(a: Annotation, now = Date.now()): void {
  a = { ...a, updated: Math.max(a.updated, now) };
  delete a.deleted;
  const s = load();
  const i = s.annotations.findIndex((x) => x.id === a.id);
  if (i >= 0) s.annotations[i] = a;
  else s.annotations.push(a);
  save(s);
}

export function removeAnnotation(id: string, now = Date.now()): Annotation | undefined {
  const s = load();
  const gone = s.annotations.find((a) => a.id === id && live(a));
  if (!gone) return undefined;
  const tomb: Annotation = { ...gone, quote: "", prefix: "", suffix: "", text: "", updated: Math.max(gone.updated + 1, now), deleted: true };
  s.annotations = s.annotations.map((a) => (a.id === id ? tomb : a));
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

// Account sync; lib/progress.ts carries the blob.

/** Union by id, the newer `updated` winning (a tombstone wins a tie); reads keep the furthest scroll and the newer read flag. */
export function mergeNotes(a: Pick<Store, "annotations" | "reads">, b: Pick<Store, "annotations" | "reads">): Pick<Store, "annotations" | "reads"> {
  const byId = new Map<string, Annotation>();
  for (const x of [...a.annotations, ...b.annotations]) {
    const cur = byId.get(x.id);
    if (!cur || x.updated > cur.updated || (x.updated === cur.updated && x.deleted && !cur.deleted)) byId.set(x.id, x);
  }
  const reads = { ...a.reads };
  for (const [k, r] of Object.entries(b.reads)) {
    const o = reads[k];
    reads[k] = o ? { pct: Math.max(o.pct, r.pct), read: r.at > o.at ? r.read : o.read, at: Math.max(o.at, r.at) } : r;
  }
  return { annotations: [...byId.values()], reads };
}

/** Canonical JSON (sorted, old tombstones dropped), so equal stores compare equal. */
function blobOf(s: Pick<Store, "annotations" | "reads">, now = Date.now()): string {
  const annotations = s.annotations.filter((a) => !a.deleted || now - a.updated < TOMBSTONE_MS).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const reads = Object.fromEntries(Object.entries(s.reads).sort(([x], [y]) => (x < y ? -1 : 1)));
  return JSON.stringify({ v: 1, annotations, reads });
}

function parseBlob(json: string | null | undefined): Pick<Store, "annotations" | "reads"> {
  try {
    const v = JSON.parse(json ?? "null") as Partial<Store> | null;
    return { annotations: Array.isArray(v?.annotations) ? v.annotations : [], reads: v?.reads && typeof v.reads === "object" ? v.reads : {} };
  } catch {
    return { annotations: [], reads: {} };
  }
}

/** Something the account doesn't have yet (a store from before sync counts when non-empty). */
export function notesDirty(): boolean {
  const s = load();
  return s.dirty ?? (s.annotations.length > 0 || Object.keys(s.reads).length > 0);
}

/** The copy to upload, or null when it is over the Worker's cap (it then stays on this device). */
export function notesBlob(): string | null {
  const b = blobOf(load());
  return b.length > MAX_NOTES_BYTES ? null : b;
}

/** Merges the account's copy in; stays dirty when this device has something the account lacks. */
export function mergeRemoteNotes(remote: string | null | undefined): void {
  const local = load();
  const theirs = parseBlob(remote);
  const merged = mergeNotes(local, theirs);
  const dirty = blobOf(merged) !== blobOf(theirs);
  if (blobOf(merged) === blobOf(local) && dirty === notesDirty()) return;
  try {
    save({ ...merged, dirty }, true);
  } catch {
    // No storage: nothing to merge into.
  }
}

/** After a successful upload of `sent`: clean, unless the store changed meanwhile. */
export function markNotesSynced(sent: string): void {
  const s = load();
  if (blobOf(s) !== sent) return;
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...s, dirty: false }));
  } catch {
    // Uploads again next sync; harmless.
  }
}

/** A different account, or a re-link: offer this device's notes again on the next sync. */
export function markNotesDirty(): void {
  const s = load();
  if (!s.annotations.length && !Object.keys(s.reads).length) return;
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...s, dirty: true }));
  } catch {
    // Without storage there is nothing to upload.
  }
}

/** "Use account only": drop this device's notes before pulling the account's. */
export function clearNotes(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
