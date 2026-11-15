// Drafts on top of the progress store's draft API: the live draft per problem, the last
// ten drafts for the Drafts menu, and a snapshot of the code at the end of each attempt
// for History and its diffs. Extra records use namespaced draft keys.

import { loadDraft, saveDraft, type Draft } from "../progress";

export const DRAFT_HISTORY = 10;
/** A new history entry at most this often while typing; runs and submits always add one. */
export const HISTORY_EVERY_MS = 120_000;

const historyKey = (problem: string) => `${problem}@drafts`;
const snapshotKey = (problem: string, attempt: string) => `${problem}@attempt:${attempt}`;

export type Opening =
  | { code: string; banner: null }
  | { code: string; banner: { kind: "draft"; savedAt: number } }
  | { code: string; banner: { kind: "review" } };

/**
 * What the editor opens with. A review opens fresh (mastery means a cold redo) and says
 * where the last draft went; otherwise a draft that differs from the starter is restored.
 */
export function opening(starter: string, draft: Draft | undefined, review: boolean): Opening {
  const edited = !!draft && draft.code.trim() !== starter.trim();
  if (review) return { code: starter, banner: edited ? { kind: "review" } : null };
  if (edited && draft) return { code: draft.code, banner: { kind: "draft", savedAt: draft.savedAt } };
  return { code: starter, banner: null };
}

export async function draftHistory(problem: string): Promise<Draft[]> {
  const raw = await loadDraft(historyKey(problem));
  if (!raw) return [];
  try {
    return JSON.parse(raw.code) as Draft[];
  } catch {
    return [];
  }
}

/** Newest first, capped at ten, skipping a repeat of the newest. */
export function pushHistory(list: Draft[], code: string, now: number): Draft[] {
  if (list[0]?.code === code || !code.trim()) return list;
  return [{ code, savedAt: now }, ...list].slice(0, DRAFT_HISTORY);
}

export async function addToHistory(problem: string, code: string, now = Date.now()): Promise<Draft[]> {
  const next = pushHistory(await draftHistory(problem), code, now);
  await saveDraft(historyKey(problem), JSON.stringify(next));
  return next;
}

export async function saveSnapshot(problem: string, attempt: string, code: string): Promise<void> {
  await saveDraft(snapshotKey(problem, attempt), code);
}

export async function loadSnapshot(problem: string, attempt: string): Promise<Draft | undefined> {
  return loadDraft(snapshotKey(problem, attempt));
}
