// Editor settings. The shared ones live in the app prefs (`readPrefs().editor`, edited on
// /settings too); line wrap and autocomplete are workspace-only and kept per device here.

import { readPrefs, updatePrefs, type EditorPrefs } from "../prefs";

export interface EditorSettings {
  vim: boolean;
  fontSize: number;
  ligatures: boolean;
  minimap: boolean;
  wrap: boolean;
  runOnSave: boolean;
  formatOnSave: boolean;
  tabSize: 2 | 4;
  autocomplete: boolean;
}

const LOCAL_KEY = "myleet-editor";

type Local = Pick<EditorSettings, "wrap" | "autocomplete">;
const DEFAULT_LOCAL: Local = { wrap: false, autocomplete: true };

export function fromPrefs(p: EditorPrefs, local: Local = DEFAULT_LOCAL): EditorSettings {
  return {
    vim: p.keymap === "vim",
    fontSize: Math.min(18, Math.max(12, Math.round(p.fontSize) || 14)),
    ligatures: p.ligatures,
    minimap: p.minimap,
    runOnSave: p.runOnSave,
    formatOnSave: p.formatOnSave,
    tabSize: p.indent === 2 ? 2 : 4,
    ...local,
  };
}

export function toPrefs(s: EditorSettings): EditorPrefs {
  return {
    keymap: s.vim ? "vim" : "standard",
    fontSize: s.fontSize,
    ligatures: s.ligatures,
    minimap: s.minimap,
    indent: s.tabSize,
    formatOnSave: s.formatOnSave,
    runOnSave: s.runOnSave,
  };
}

function readLocal(): Local {
  try {
    return { ...DEFAULT_LOCAL, ...(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Partial<Local>) };
  } catch {
    return DEFAULT_LOCAL;
  }
}

export function loadSettings(): EditorSettings {
  return fromPrefs(readPrefs().editor, readLocal());
}

export function saveSettings(s: EditorSettings): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ wrap: s.wrap, autocomplete: s.autocomplete } satisfies Local));
  } catch {
    // Private windows can refuse storage; the setting still applies for this visit.
  }
  updatePrefs({ editor: toPrefs(s) });
}
