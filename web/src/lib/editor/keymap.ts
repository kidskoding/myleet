// The workspace keyboard map (editor-spec "Keyboard map"). No browser-reserved keys
// (Ctrl+1..9, Ctrl+T/W/N/Tab), no chords after the palette key, and nothing on a bare Esc
// while the editor has focus, since Vim users live on Esc.

export type Action =
  | "run"
  | "runCustom"
  | "submit"
  | "save"
  | "nextProblem"
  | "prevProblem"
  | "hint"
  | "docs"
  | "pause"
  | "focusMode"
  | "toggleProblem"
  | "toggleTests"
  | "nextPane"
  | "prevPane"
  | "palette"
  | "fullscreen"
  | "shortcuts"
  | "escape"
  | "back";

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface KeyContext {
  mac: boolean;
  /** Focus is inside CodeMirror. */
  inEditor: boolean;
  /** Focus is in a text field outside the editor (custom input, palette, settings). */
  inField: boolean;
  /** The custom-input field specifically, where Mod+Enter runs only that input. */
  inCustomField?: boolean;
}

type Binding = { mod?: boolean; shift?: boolean; key: string; action: Action };

const BINDINGS: Binding[] = [
  { mod: true, shift: true, key: "enter", action: "submit" },
  { mod: true, key: "enter", action: "run" },
  { mod: true, key: "s", action: "save" },
  { shift: true, key: "f8", action: "prevProblem" },
  { key: "f8", action: "nextProblem" },
  { mod: true, key: "h", action: "hint" },
  { mod: true, key: "i", action: "docs" },
  { mod: true, key: ".", action: "pause" },
  { mod: true, shift: true, key: "f", action: "focusMode" },
  { mod: true, key: "b", action: "toggleProblem" },
  { mod: true, key: "j", action: "toggleTests" },
  { shift: true, key: "f6", action: "prevPane" },
  { key: "f6", action: "nextPane" },
  { mod: true, key: "k", action: "palette" },
  { key: "f11", action: "fullscreen" },
];

/** Maps one keydown to a workspace action, or null to let the editor or browser have it. */
export function actionFor(e: KeyLike, ctx: KeyContext): Action | null {
  const mod = ctx.mac ? e.metaKey : e.ctrlKey;
  // The other platform modifier never counts (Ctrl+S on a Mac stays the editor's).
  const otherMod = ctx.mac ? e.ctrlKey : e.metaKey;
  const key = e.key.toLowerCase();
  if (!otherMod && !e.altKey) {
    for (const b of BINDINGS) {
      if (b.key === key && !!b.mod === mod && !!b.shift === e.shiftKey) {
        if (b.action === "run" && ctx.inCustomField) return "runCustom";
        if (b.action === "docs" && !ctx.inEditor) return null;
        return b.action;
      }
    }
  }
  if (ctx.inEditor || ctx.inField || mod || otherMod || e.altKey) return null;
  if (key === "escape") return "escape";
  if (e.key === "?") return "shortcuts";
  return null;
}

/** `g` then `t` (focus outside the editor) goes back to Today. Returns a fresh handler. */
export function chordHandler(timeoutMs = 1200): (e: KeyLike, ctx: KeyContext, now: number) => Action | null {
  let gAt = -Infinity;
  return (e, ctx, now) => {
    if (ctx.inEditor || ctx.inField || e.ctrlKey || e.metaKey || e.altKey) return null;
    const k = e.key.toLowerCase();
    if (k === "g") {
      gAt = now;
      return null;
    }
    const hit = k === "t" && now - gAt <= timeoutMs;
    gAt = -Infinity;
    return hit ? "back" : null;
  };
}

export interface Shortcut {
  action: Action | "find" | "comment" | "multi" | "leave";
  label: string;
  /** Mac glyphs; `keyLabel` swaps them for Ctrl on other platforms. */
  keys: string;
}

export const SHORTCUTS: Shortcut[] = [
  { action: "run", label: "Run tests", keys: "⌘↵" },
  { action: "submit", label: "Submit attempt", keys: "⌘⇧↵" },
  { action: "save", label: "Format and save", keys: "⌘S" },
  { action: "nextProblem", label: "Next problem (lint or failing test)", keys: "F8" },
  { action: "prevProblem", label: "Previous problem", keys: "⇧F8" },
  { action: "hint", label: "Next hint", keys: "⌘H" },
  { action: "docs", label: "Docs at cursor", keys: "⌘I" },
  { action: "pause", label: "Pause or resume timer", keys: "⌘." },
  { action: "focusMode", label: "Focus mode", keys: "⌘⇧F" },
  { action: "toggleProblem", label: "Toggle Problem pane", keys: "⌘B" },
  { action: "toggleTests", label: "Toggle Tests pane", keys: "⌘J" },
  { action: "nextPane", label: "Move focus between panes", keys: "F6" },
  { action: "palette", label: "Command palette", keys: "⌘K" },
  { action: "find", label: "Find (Tab to replace)", keys: "⌘F" },
  { action: "comment", label: "Toggle comment", keys: "⌘/" },
  { action: "multi", label: "Add next occurrence / all", keys: "⌘D / ⌘⇧L" },
  { action: "leave", label: "Leave the editor", keys: "Esc then Tab" },
  { action: "back", label: "Back to Today", keys: "g t" },
];

/** `⌘⇧↵` on a Mac, `Ctrl+Shift+Enter` elsewhere. */
export function keyLabel(keys: string, mac: boolean): string {
  if (mac) return keys;
  return keys
    .split(" / ")
    .map((k) =>
      k
        .replace("⌘", "Ctrl+")
        .replace("⇧", "Shift+")
        .replace("↵", "Enter"),
    )
    .join(" / ");
}

export function isMac(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}
