# Problem workspace

`/p/<id>` (design: `.planning/design/screens/problem/`). `Workspace.astro` server-renders the
chrome, the statement and the highlighted starter; `mount.ts` turns it into the editor, runner,
timer and attempt recorder. Editor libs live in `src/lib/editor/`.

## Modes

`?mode=` picks the mode: `practice` (default), `drill`, `interview`, `placement`, `checkpoint`.
Parent flows can also call `mountWorkspace(root, { mode, targetSecs, backHref, onReport })`.

| | practice / drill | interview | placement / checkpoint |
| --- | --- | --- | --- |
| Records | `opened`, `hint_revealed`, `solution_peeked`, `say_aloud_checked`, `timer_restarted`, on Submit `test_run` then `passed` (`elapsed_ms`) or, after a confirm, `gave_up` (`reason: failed_submit`); Give up `gave_up`; leaving an opened unfinished attempt `left` | `opened`, `test_run` on Submit | `opened`, `hint_revealed`, `test_run` on Submit |
| Never records | | `passed`, `gave_up`, `left` | `passed`, `gave_up`, `left` |
| Hints / key idea | yes / yes | hidden | yes / no |
| Solution, Custom input, pause, restart, give up | yes | no | no |
| Focus mode, autocomplete | off / on | on / off ("Interview mode") | off / on |
| Timer target | problem target | `targetSecs`, else `interview_rules().round_secs` | problem target |
| Back arrow | `/app` | `/app` | placement `/onboarding?step=warm-up`, checkpoint `/app` |

Run never records anything in any mode.

## Exam completion contract

After every Run, Submit and hint the workspace reports a `WorkspaceReport`:

```ts
interface WorkspaceReport {
  problem: string;
  attempt: string | null; // events.jsonl attempt id, null before the first recorded action
  mode: Mode;
  event: "run" | "submit" | "hint";
  passed: number;
  total: number;
  green: boolean; // total > 0 && passed === total, for this run
  hints: number; // hints opened in this attempt
  elapsedMs: number; // timer, pauses excluded
  overTarget: boolean;
}
```

It arrives two ways: `opts.onReport(report)` when the parent mounts the workspace itself, and a
bubbling `myleet:workspace-report` `CustomEvent` (detail = the report) on `#workspace`, which a
page script can catch on `document`:

```ts
document.addEventListener("myleet:workspace-report", (e) => {
  const r = (e as CustomEvent<WorkspaceReport>).detail;
  if (r.event === "submit") finishRound(r); // the parent records the outcome
});
```

In exam modes the parent owns the outcome: use the last `submit` report to build
`placementDone` / `checkpointDone` results (`{problem, passed: r.green, hints: r.hints}`), or append
its own `passed` line (`trainer.eventLine({kind: "passed", attempt: r.attempt, mode, data:
{elapsed_ms}})`) for an interview round. Practice and drill also emit reports, after the workspace has
recorded the attempt itself.

## Personalization mount points

`mountWorkspace` takes `renderReason(el, ctx)` for the reason line under the title
(`[data-reason]`, which otherwise shows Today's reason or the breadcrumb, beside the
`[data-pace]` "Target 25 min. You usually take 19." line) and `renderChanges(el, ctx)` for the
result sheet's "What this changes" block (`[data-changes]`, empty without it).
