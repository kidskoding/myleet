// The public diagnostic (/diagnostic): about eight "which pattern fits?" questions built
// from real catalog problems, then two or three coding problems in the workspace chosen
// from the weakest answers. Everything here is pure; the page script keeps the state in
// localStorage and writes one `placement_done` line at the end (the core reads it).
import type { ItemProgress } from "./attempts";
import { midSentence } from "./schedule";
import type { Catalog, Difficulty, PlacementResult, Playlist, ProblemMeta } from "./types";

export interface Topic {
  id: string;
  /** The answer as the learner reads it. */
  label: string;
  module: string;
  /** Technique ids that teach this pattern; empty means the whole module. */
  techniques: string[];
  /** Titles that name the answer outright, so the question would be free. */
  giveaway?: RegExp;
  /** Labels a learner plausibly confuses with this one, most likely first. */
  confusions: string[];
}

const GREEDY = "Greedy";
const BACKTRACKING = "Backtracking";
const SORTING = "Sort first";
const PREFIX = "Prefix sums";

export const TOPICS: Topic[] = [
  { id: "hashing", label: "Hash map or set", module: "arrays_and_hashing", techniques: ["hashing"], giveaway: /hash/i, confusions: ["Two pointers", SORTING, "Sliding window", PREFIX] },
  { id: "two-pointers", label: "Two pointers", module: "two_pointers", techniques: [], giveaway: /pointer/i, confusions: ["Hash map or set", "Sliding window", "Binary search", SORTING] },
  { id: "sliding-window", label: "Sliding window", module: "sliding_window", techniques: [], giveaway: /window/i, confusions: ["Two pointers", PREFIX, "Hash map or set", "Dynamic programming"] },
  { id: "binary-search", label: "Binary search", module: "binary_search", techniques: [], giveaway: /binary search|search/i, confusions: ["Two pointers", SORTING, GREEDY, "Heap"] },
  { id: "trees", label: "Tree DFS or BFS", module: "trees", techniques: [], confusions: ["Graph BFS or DFS", BACKTRACKING, "Dynamic programming", "Stack"] },
  { id: "graphs", label: "Graph BFS or DFS", module: "graphs", techniques: ["graph_basics", "grid_dfs", "grid_bfs", "components_cycles_and_bipartite", "implicit_state_bfs"], confusions: ["Tree DFS or BFS", BACKTRACKING, "Dynamic programming", GREEDY] },
  { id: "stack", label: "Stack", module: "stacks_and_queues", techniques: ["stack_fundamentals", "monotonic_stack"], giveaway: /stack/i, confusions: ["Two pointers", "Hash map or set", "Heap", "Sliding window"] },
  { id: "heaps", label: "Heap", module: "heaps", techniques: ["top_k", "two_heaps", "k_way_merge"], giveaway: /heap/i, confusions: [SORTING, "Binary search", "Intervals: sort and sweep", GREEDY] },
  { id: "dp", label: "Dynamic programming", module: "dp", techniques: [], confusions: [GREEDY, BACKTRACKING, "Graph BFS or DFS", "Sliding window"] },
  { id: "intervals", label: "Intervals: sort and sweep", module: "intervals", techniques: [], giveaway: /interval/i, confusions: [GREEDY, "Heap", "Two pointers", SORTING] },
];

/** Asked every time; two of the rest join them, picked by the seed. */
const ALWAYS = 6;
export const QUESTIONS = 8;
export const OPTIONS = 4;
/** A right answer slower than this counts as shaky. */
export const QUICK_MS = 60_000;
export const CODING_MAX = 3;
const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

export interface Question {
  topic: string;
  problem: string;
  /** `OPTIONS` labels, the answer among them. */
  options: string[];
  answer: string;
}

export interface Answer {
  topic: string;
  problem: string;
  /** null: "I don't know this yet". */
  choice: string | null;
  ms: number;
}

export interface CodingItem {
  topic: string;
  problem: string;
  difficulty: Difficulty;
  /** Picked from the learner's target company set. */
  company?: boolean;
}

export interface DiagnosticState {
  seed: number;
  /** Placement attempts before this don't count toward this run. */
  started: number;
  answers: Answer[];
  coding: CodingItem[];
}

/** mulberry32: small, fast and the same on every browser. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export const topicById = (id: string): Topic | undefined => TOPICS.find((t) => t.id === id);

/** The topic's problems at `levels`, in catalog order; bank modules never count. */
export function topicProblems(c: Catalog, topic: Topic, levels: Difficulty[]): ProblemMeta[] {
  const m = c.modules.find((x) => x.id === topic.module && !x.bank);
  if (!m) return [];
  const techs = topic.techniques.length ? m.techniques.filter((t) => topic.techniques.includes(t.id)) : m.techniques;
  return techs.flatMap((t) => t.problems.map((i) => c.problems[i])).filter((p): p is ProblemMeta => !!p && levels.includes(p.difficulty));
}

const leetcode = (p: ProblemMeta) => /leetcode\.com\/problems\//.test(p.url);

/** The same seed always gives the same questions, options and order. */
export function questions(c: Catalog, seed: number): Question[] {
  const r = rng(seed);
  const extra = shuffle(TOPICS.slice(ALWAYS), r).slice(0, QUESTIONS - ALWAYS);
  const picked = TOPICS.filter((t, i) => i < ALWAYS || extra.includes(t));
  const out: Question[] = [];
  for (const t of picked) {
    const pool = topicProblems(c, t, ["easy", "medium"]).filter((p) => leetcode(p) && !t.giveaway?.test(p.title));
    const p = pool[Math.floor(r() * pool.length)];
    if (!p) continue;
    const wrong = shuffle(t.confusions.slice(0, OPTIONS), r).slice(0, OPTIONS - 1);
    out.push({ topic: t.id, problem: p.id, options: shuffle([t.label, ...wrong], r), answer: t.label });
  }
  return out;
}

export type Grade = "clean" | "hinted" | "failed" | "skipped";

export function gradeAnswer(q: Pick<Question, "answer">, a: Pick<Answer, "choice" | "ms">): Grade {
  if (a.choice === null) return "skipped";
  if (a.choice !== q.answer) return "failed";
  return a.ms > QUICK_MS ? "hinted" : "clean";
}

const RANK: Record<Grade, number> = { skipped: 0, failed: 0, hinted: 1, clean: 2 };

/** A finished coding attempt's grade; "I don't know this yet" is recorded as a give-up. */
export function gradeCoding(p: ItemProgress, targetSecs: number): Grade | null {
  const a = p.finished;
  if (!a) return null;
  if (a.gaveUp && !a.passed) return "skipped";
  if (!a.passed) return "failed";
  const over = a.elapsedMs !== null && a.elapsedMs > targetSecs * 1000;
  return a.hints || a.peeks || over ? "hinted" : "clean";
}

/**
 * The next coding problem, or null when the run is over. Weakest answers first (then
 * topic order); a topic missed in the questions starts easy, a right answer starts medium,
 * and a clean pass steps the next problem up one level. Two problems without a clean pass
 * end the run: a third would only repeat what they showed.
 */
export function nextCoding(c: Catalog, s: DiagnosticState, qs: Question[], graded: (Grade | null)[], company?: Playlist | null): CodingItem | null {
  if (s.coding.length >= CODING_MAX || graded.some((g) => g === null)) return null;
  if (s.coding.length >= 2 && !graded.includes("clean")) return null;
  const done = new Set(s.coding.map((x) => x.topic));
  const used = new Set([...s.coding.map((x) => x.problem), ...s.answers.map((a) => a.problem)]);
  const byTopic = new Map(s.answers.map((a) => [a.topic, a]));
  const order = TOPICS.map((t, i) => {
    const a = byTopic.get(t.id);
    const q = qs.find((x) => x.topic === t.id);
    return { t, i, g: a && q ? gradeAnswer(q, a) : null };
  })
    .filter((x) => x.g !== null && !done.has(x.t.id))
    .sort((x, y) => RANK[x.g as Grade] - RANK[y.g as Grade] || x.i - y.i);
  const pick = !s.coding.length && company ? companyPick(c, company, order.filter((x) => RANK[x.g as Grade] < 2).map((x) => x.t), used) : null;
  if (pick) return pick;
  const last = s.coding.at(-1);
  const lastGrade = graded.at(-1);
  const r = rng(s.seed + s.coding.length + 1);
  for (const { t, g } of order) {
    const base: Difficulty = RANK[g as Grade] === 0 ? "easy" : "medium";
    const want = last && lastGrade === "clean" ? (LEVELS[Math.min(LEVELS.indexOf(last.difficulty) + 1, LEVELS.length - 1)] as Difficulty) : base;
    // Fall back a level when a topic has nothing at the wanted one.
    for (const level of LEVELS.slice(0, LEVELS.indexOf(want) + 1).reverse()) {
      const pool = topicProblems(c, t, [level]).filter((p) => !used.has(p.id));
      const p = pool[Math.floor(r() * pool.length)];
      if (p) return { topic: t.id, problem: p.id, difficulty: level };
    }
  }
  return null;
}

/** A medium problem from the company's set in the first unsure topic that has one, or null. */
export function companyPick(c: Catalog, pl: Playlist, unsure: Topic[], used: Set<string>): CodingItem | null {
  const inSet = new Set(pl.entries.flatMap((e) => (e.problem === null ? [] : [c.problems[e.problem]?.id])));
  for (const t of unsure) {
    const p = topicProblems(c, t, ["medium"]).find((x) => inSet.has(x.id) && !used.has(x.id));
    if (p) return { topic: t.id, problem: p.id, difficulty: "medium", company: true };
  }
  return null;
}

/** Where a result row came from: a problem the learner coded, or a pattern answer. */
export type Finding = { source: "coded"; grade: Grade; mins: number | null } | { source: "answered"; grade: Grade };

/** One finding per problem id, for the results page to say where each row came from. */
export function findings(s: DiagnosticState, qs: Question[], graded: (Grade | null)[], mins: (number | null)[]): Record<string, Finding> {
  const out: Record<string, Finding> = {};
  for (const a of s.answers) {
    const q = qs.find((x) => x.topic === a.topic);
    if (q) out[a.problem] = { source: "answered", grade: gradeAnswer(q, a) };
  }
  s.coding.forEach((c, i) => {
    const g = graded[i];
    if (g) out[c.problem] = { source: "coded", grade: g, mins: mins[i] ?? null };
  });
  return out;
}

const minutes = (m: number | null) => (m === null ? "" : ` in ${m} minute${m === 1 ? "" : "s"}`);

/** "You coded sliding window cleanly in 9 minutes" or "You weren't sure which pattern fits interval problems". */
export function findingText(f: Finding, topic: string): string {
  const t = midSentence(topic);
  if (f.source === "coded") {
    if (f.grade === "clean") return `You coded ${t} cleanly${minutes(f.mins)}`;
    if (f.grade === "hinted") return `You coded ${t}, but with hints or extra time${minutes(f.mins)}`;
    if (f.grade === "skipped") return `You chose "I don't know this yet" on the ${t} problem`;
    return `You coded ${t}, but the tests didn't all pass`;
  }
  if (f.grade === "clean") return `You spotted the ${t} pattern right away`;
  if (f.grade === "hinted") return `You found the ${t} pattern, but slowly`;
  if (f.grade === "skipped") return `You weren't sure which pattern fits ${t} problems`;
  return `You picked the wrong pattern for a ${t} problem`;
}

/** The results headline: what they coded comes first, pattern answers only fill in the rest. */
export function summaryLine(fs: Finding[]): string {
  const coded = fs.filter((f) => f.source === "coded");
  const asked = fs.length - coded.length;
  const clean = coded.filter((f) => f.grade === "clean").length;
  const code = !coded.length ? "" : clean === coded.length ? `You coded ${coded.length === 1 ? "your problem" : `all ${coded.length} problems`} cleanly` : `You coded ${coded.length} problem${coded.length === 1 ? "" : "s"}, and ${clean} went cleanly`;
  const rest = asked ? `${code ? "The pattern questions covered" : "Your pattern answers cover"} ${asked} more topic${asked === 1 ? "" : "s"}` : "";
  return [code, rest].filter(Boolean).join(". ");
}

/**
 * One `placement_done` item per topic: the coding problem when there was one, otherwise
 * the question. Topic order matters: the core recommends the first weak topic.
 */
export function placementItems(s: DiagnosticState, qs: Question[], graded: (Grade | null)[]): PlacementResult[] {
  const out: PlacementResult[] = [];
  for (const t of TOPICS) {
    const ci = s.coding.findIndex((x) => x.topic === t.id);
    const code = ci >= 0 ? graded[ci] : null;
    const a = s.answers.find((x) => x.topic === t.id);
    const q = qs.find((x) => x.topic === t.id);
    const grade = code ?? (a && q ? gradeAnswer(q, a) : null);
    const problem = code ? s.coding[ci]?.problem : a?.problem;
    if (!grade || !problem) continue;
    out.push({
      topic: t.label.toLowerCase().replace(/[:,]/g, ""),
      problem,
      passed: grade === "clean" || grade === "hinted",
      skipped: grade === "skipped",
      over_time: grade === "hinted",
    });
  }
  return out;
}

/** The first paragraphs of a LeetCode statement, before the examples. */
export function excerpt(markdown: string, maxChars = 700): string {
  const head = markdown.split(/\n\s*(?:\*\*|#+\s*)?Example\b/i)[0] ?? markdown;
  const paras = head.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let out = "";
  for (const p of paras) {
    if (out && out.length + p.length > maxChars) break;
    out += (out ? "\n\n" : "") + p;
  }
  return out;
}
