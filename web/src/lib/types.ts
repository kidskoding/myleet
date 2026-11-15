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

export type PlaylistGroup = "Big Tech" | "Consumer and Business Tech" | "AI & Startups" | "Trading Firms" | "Fortune 500";

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
  /** The skill model's reason line, e.g. `overdue 2d, just learned`. */
  why?: string;
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
  /** Practice days in a row, with one rest day a week forgiven. */
  streak: number;
  /** Rest days inside the streak, newest first. */
  rest_days: string[];
  last_practiced: string | null;
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
  | "checkpoint_done"
  | "leetcode_imported"
  | "leetcode_solved"
  | "leetcode_disconnected";
export type Mode = "practice" | "drill" | "interview" | "placement" | "checkpoint" | "leetcode";

// ---- planner and skills (crates/wasm README "Planner and skills") ----

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Availability {
  days: Weekday[];
  /** `HH:MM`; `end` may be `24:00`. */
  start: string;
  end: string;
}

/** The account `settings` subset the planner reads; missing fields take defaults. */
/** One interview: a date and, optionally, a company (a playlist slug). */
export interface Interview {
  date: string;
  company: string | null;
  /** The company's display name, on a plan only. */
  name?: string | null;
}

export interface PlanSettings {
  interview_date?: string | null;
  interviews?: Interview[];
  target_companies?: string[];
  /** Module ids, e.g. `graphs`. */
  focus_topics?: string[];
  new_per_day?: number;
  daily_minutes?: number;
  session_minutes?: number;
  availability?: Availability[];
  days_off?: string[];
  /** Device-local (the Worker does not store these yet). */
  weekend_minutes?: number | null;
  day_minutes?: Record<string, number>;
  moves?: PlanMove[];
}

/** A dragged session: `minutes` at `from_start` on `from` now happen at `to_start` on `to`. */
export interface PlanMove {
  from: string;
  from_start: string;
  to: string;
  to_start: string;
  minutes: number;
}

export type PlanItemKind = "review" | "new" | "drill" | "note" | "mock" | "checkpoint";
/** The reason tag an item wears (its hold colour). */
export type PlanTag = "review" | "weak" | "new" | "progress" | "sharp" | "mock" | "check";

export interface WhyChip {
  /** A Lucide icon name. */
  icon: string;
  text: string;
}

export interface PlanItem {
  kind: PlanItemKind;
  tag: PlanTag;
  problem: string | null;
  title: string;
  technique: string | null;
  minutes: number;
  reason: string;
  note?: string;
  chips?: WhyChip[];
}

export interface PlanSession {
  id: string;
  start_ms: number;
  end_ms: number;
  minutes: number;
  title: string;
  items: PlanItem[];
  moved_from?: string;
}

export interface PlanDay {
  date: string;
  weekday: Weekday;
  rest: boolean;
  minutes: number;
  sessions: PlanSession[];
  cap: number;
  off: boolean;
  windows: { start: string; end: string }[];
}

export interface NoteAction {
  kind: "weekday_minutes" | "availability" | "set_date" | "clear_date" | "open_plan" | "roadmap" | "change_plan" | "keep_pace" | "add_time" | "spread";
  label: string;
  value?: number;
}

/** A re-plan note: what changed, in counts, and what it means for the date. */
export interface PlanNote {
  kind: "missed" | "away" | "great_day" | "over_budget" | "cram" | "date_passed" | "backlog";
  title: string;
  body: string;
  actions: NoteAction[];
}

export interface PlanFixes {
  techniques: { module: string; technique: string; weekday_minutes: number | null }[];
  all: number | null;
  note: PlanNote | null;
}

export interface Insight {
  kind: string;
  icon: string;
  /** `**bold**` marks the two facts. */
  text: string;
}

export interface Habits {
  history: {
    sessions: number;
    /** `[weekday 0 = Monday, half-hour slot 0..47]`. */
    cells: [number, number][];
    suggestion: { windows: Availability[]; sessions: number; text: string } | null;
  };
  insights: Insight[];
}

export type SkillLevel = "new" | "shaky" | "building" | "solid" | "strong";

export interface AttemptFeedback {
  module: string;
  technique: string;
  technique_title: string;
  before: SkillLevel;
  after: SkillLevel;
  trend: "improving" | "flat" | "slipping" | null;
  text: string;
  cleared: boolean;
  weak_spot: boolean;
}

export type SkillCause = "cant_start" | "wrong_approach" | "edge_cases" | "too_slow" | "forgetting";

export interface Forecast {
  module: string;
  technique: string;
  title: string;
  module_title: string;
  companies: string[];
  goal: number;
  started_now: number;
  /** Started problems already on the mastered rung. */
  mastered_now?: number;
  projected: number;
  status: "on_track" | "behind";
  behind_by: number;
  mastery: number;
  confidence: number;
  cause: SkillCause | null;
}

export interface Plan {
  version: number;
  generated_ms: number;
  tz: string;
  start: string;
  end: string;
  interview_date: string | null;
  /** Today's and later interviews, soonest first. */
  interviews?: Interview[];
  pace: {
    median_secs: Partial<Record<Difficulty, number>>;
    speed: Record<Difficulty, number>;
    new_minutes: Record<Difficulty, number>;
    best_hour: number | null;
    review_minutes?: number | null;
    sample?: number;
    habit?: string | null;
  };
  days: PlanDay[];
  forecast: Forecast[];
  summary: {
    days_left: number;
    sessions: number;
    minutes: number;
    reviews: number;
    new: number;
    drills: number;
    mocks: number;
    checkpoints: number;
    on_track: boolean;
    behind: string[];
    headline: string;
  };
  notes?: PlanNote[];
}

export interface SkillAction {
  kind: "read_note" | "warmup" | "edge_case_redo" | "timed_rep" | "spaced_redo" | "next";
  problem: string | null;
  note: string | null;
  reason: string;
  title: string;
  minutes: number;
}

export interface SkillAttempt {
  problem: string;
  title: string;
  date: string;
  mark: "clean" | "missed" | "hint" | "over";
  cause: SkillCause | null;
  detail: string;
}

export interface Skill {
  module: string;
  module_title: string;
  technique: string;
  technique_title: string;
  mastery: number;
  confidence: number;
  trend: "improving" | "flat" | "slipping" | null;
  cause: SkillCause | null;
  weak: boolean;
  need: number;
  priority: number;
  companies: { company: string; problems: number }[];
  seen: number;
  total: number;
  evidence: Record<string, number>;
  actions: SkillAction[];
  level: SkillLevel;
  sureness: "none" | "first_read" | "fairly_sure" | "sure";
  recent: number;
  /** Weak with 4+ recent attempts: the only case the UI says "Weak spot". */
  weak_spot: boolean;
  /** A first read (1-3 attempts) with a cause: "Watching". */
  watch: boolean;
  diagnosis: string;
  history: SkillAttempt[];
  clean_per_week: number[];
  technique_number: number;
  techniques_in_module: number;
}

export interface Skills {
  techniques: Skill[];
  modules: { module: string; title: string; mastery: number; confidence: number }[];
}

// ---- LeetCode import (worker GET /api/leetcode/profile, crates/core leetcode.rs) ----

export interface LeetcodeProfile {
  username: string;
  solved: { all: number; easy: number; medium: number; hard: number };
  tags: { name: string; solved: number }[];
  recent: { slug: string; timestamp: number }[];
}

export interface LeetcodeImport {
  username: string;
  total: number;
  modules: { id: string; title: string; solved: number }[];
  /** Module ids with little or no LeetCode history, which the planner starts with. */
  weak: string[];
  /** Problems marked "solved on LeetCode". */
  marked: number;
}
