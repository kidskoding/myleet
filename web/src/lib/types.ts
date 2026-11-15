// Mirrors crates/core/src/catalog/data.rs (catalog.json) and crates/wasm (JSON results).

export type Difficulty = "easy" | "medium" | "hard";

export interface NoteRef {
  title: string;
  /** Relative to `data/notes/`, e.g. `guide/01_how_to_prep.md`. */
  path: string;
}

export interface Technique {
  id: string;
  title: string;
  number: number;
  note: string | null;
  /** Indices into `Catalog.problems`. */
  problems: number[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  number: number;
  bank: boolean;
  dir: string;
  notes: NoteRef[];
  techniques: Technique[];
}

export interface ProblemMeta {
  id: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  leetcode: number;
  hints: string[];
  key_idea: string;
  say_aloud: string[];
  time_target_secs: number;
  number: number;
  /** Index into `Catalog.modules`. */
  module: number;
  /** Index into that module's `techniques`. */
  technique: number;
  has_solution: boolean;
  dir: string;
}

export interface PlaylistEntry {
  title: string;
  url: string;
  /** Index into `Catalog.problems` when the entry is tracked. */
  problem: number | null;
}

export type PlaylistGroup = "Big tech" | "Little tech" | "AI labs / high growth" | "Quant" | "Fortune 500";

export interface Playlist {
  id: string;
  title: string;
  group: PlaylistGroup;
  focus: string;
  entries: PlaylistEntry[];
}

export interface Catalog {
  guide: NoteRef[];
  modules: Module[];
  problems: ProblemMeta[];
  playlists: Playlist[];
}

/** `problems/<id>.json`. */
export interface ProblemFiles {
  id: string;
  prompt: string;
  starter: string;
  test: string;
  solution?: string;
}

// ---- wasm results ----

export type Status = "unseen" | "learning" | "reviewing" | "mastered";

export interface State {
  status: Status;
  rung: number;
  due_ms: number | null;
  last_ms: number | null;
  first_ms: number | null;
  attempts: number;
  clean_passes: number;
  fails: number;
  hint_attempts: number;
  best_secs: number | null;
}

export type ItemOutcome = "clean" | "hinted" | "failed" | "skipped";
export type Level = "strong" | "shaky" | "start here";

export interface Item {
  topic: string;
  problem: string;
  module: string;
  outcome: ItemOutcome;
  level: Level;
}

export interface TodayEntry {
  problem: string;
  index: number;
  kind: "review" | "new" | "practice";
  reason: string | null;
  overdue_days: number;
  state: State;
}

export interface Weak {
  module: string;
  module_title: string;
  technique: string;
  technique_title: string;
  fail_rate: number;
  hint_rate: number;
  attempts: number;
}

export interface Stats {
  counts: Record<Status, number>;
  mastery: [number, number];
  streak: number;
  heatmap: Record<string, number>;
  weakest: Weak[];
  median_secs: Partial<Record<Difficulty, number>>;
}

export interface Placement {
  needs: boolean;
  done: boolean;
  items: { topic: string; problem: string }[];
  result: { skipped: boolean; items: Item[] } | null;
  weak_modules: string[];
  recommend: string | null;
}

export interface PlacementResult {
  topic: string;
  problem: string;
  passed: boolean;
  hints?: number;
  skipped?: boolean;
  over_time?: boolean;
}

export interface Checkpoint {
  suggest_through: number;
  default_through: number;
  ceilings: { number: number; id: string; title: string }[];
  result: { through: number; items: Item[] } | null;
  weak_modules: string[];
  recommend: string | null;
}

export interface CheckpointResult {
  problem: string;
  passed: boolean;
  hints?: number;
  skipped?: boolean;
}

export interface InterviewRules {
  round_secs: number;
  hint_penalty_secs: number;
}

// crates/core/src/progress.rs `kind` and `mode`.
export type EventKind =
  | "opened"
  | "hint_revealed"
  | "solution_peeked"
  | "test_run"
  | "passed"
  | "gave_up"
  | "left"
  | "reset"
  | "say_aloud_checked"
  | "timer_restarted"
  | "placement_done"
  | "checkpoint_done";
export type Mode = "practice" | "drill" | "interview" | "placement" | "checkpoint";
