// One attempt at a problem, recorded as events.jsonl lines the same way the Rust trainer
// did: `opened` on the first real action, `hint_revealed`, `solution_peeked`,
// `say_aloud_checked`, `timer_restarted`, and on Submit `test_run` then `passed`
// (with `elapsed_ms`) or, after a confirm, `gave_up`. Run never records anything.
//
// Exam modes (interview, placement, checkpoint) never record `passed`, `gave_up` or
// `left`: the parent flow owns the outcome and reads it from the workspace report.

import type { EventKind, Mode } from "../types";

export interface AttemptDeps {
  eventLine(e: { kind: EventKind; problem: string; attempt: string; mode: Mode; data?: Record<string, string>; now?: number }): string;
  newAttemptId(): string;
  /** Appends one line and resolves to the whole events text. */
  append(line: string): Promise<string>;
  now(): number;
}

export type AttemptEnd = "passed" | "gave_up" | "failed_submit";

export const EXAM_MODES: readonly Mode[] = ["interview", "placement", "checkpoint"];

export function isExam(mode: Mode): boolean {
  return EXAM_MODES.includes(mode);
}

export class Attempt {
  id: string | null = null;
  hints = 0;
  peeks = 0;
  restarts = 0;
  end: AttemptEnd | null = null;
  /** The latest events text after this attempt's last write, if any. */
  events: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly problem: string,
    readonly mode: Mode,
    private readonly deps: AttemptDeps,
  ) {}

  get exam(): boolean {
    return isExam(this.mode);
  }

  get opened(): boolean {
    return this.id !== null;
  }

  /** Not clean for the ladder: a hint, a peek or a restart before passing. Overtime is checked by the caller. */
  get assisted(): boolean {
    return this.hints > 0 || this.peeks > 0 || this.restarts > 0;
  }

  /** Records `opened` once; every other record calls this first. */
  open(): Promise<string> {
    if (this.id) return Promise.resolve(this.id);
    this.id = this.deps.newAttemptId();
    const id = this.id;
    return this.write("opened").then(() => id);
  }

  async hint(penaltyMs?: number): Promise<void> {
    await this.open();
    if (!this.end) this.hints++;
    await this.write("hint_revealed", penaltyMs ? { penalty_ms: String(Math.round(penaltyMs)) } : undefined);
  }

  async peek(): Promise<void> {
    if (this.exam) return;
    await this.open();
    if (!this.end) this.peeks++;
    await this.write("solution_peeked");
  }

  async sayAloud(item: string): Promise<void> {
    await this.open();
    await this.write("say_aloud_checked", { item });
  }

  async restart(): Promise<void> {
    if (this.exam) return;
    await this.open();
    if (!this.end) this.restarts++;
    await this.write("timer_restarted");
  }

  /** Submit's run. Returns true when this attempt now records a pass. */
  async submit(passed: number, total: number, elapsedMs: number): Promise<boolean> {
    await this.open();
    await this.write("test_run", { passed: String(passed), total: String(total) });
    const green = total > 0 && passed === total;
    if (!green || this.exam || this.end) return false;
    this.end = "passed";
    await this.write("passed", { elapsed_ms: String(Math.round(elapsedMs)) });
    return true;
  }

  /** A confirmed Submit with failing tests: counts as a miss. */
  async submitFailing(passed: number, total: number): Promise<void> {
    await this.open();
    await this.write("test_run", { passed: String(passed), total: String(total) });
    if (this.exam || this.end) return;
    this.end = "failed_submit";
    await this.write("gave_up", { reason: "failed_submit" });
  }

  async giveUp(): Promise<void> {
    if (this.exam || this.end) return;
    await this.open();
    this.end = "gave_up";
    await this.write("gave_up");
  }

  /** On leaving the page: only an opened, unfinished practice attempt records `left`. */
  async leave(): Promise<void> {
    if (!this.id || this.end || this.exam) return;
    this.end = "gave_up";
    await this.write("left");
  }

  private write(kind: EventKind, data?: Record<string, string>): Promise<void> {
    const id = this.id;
    if (!id) throw new Error("attempt not opened");
    const line = this.deps.eventLine({
      kind,
      problem: this.problem,
      attempt: id,
      mode: this.mode,
      now: this.deps.now(),
      ...(data ? { data } : {}),
    });
    const next = this.queue.then(() => this.deps.append(line)).then((text) => {
      this.events = text;
    });
    this.queue = next.catch(() => {});
    return next;
  }
}
