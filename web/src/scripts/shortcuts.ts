// The `?` cheat sheet. Platform-aware: ⌘ on Apple devices, Ctrl elsewhere.
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { closeDialog, openDialog } from "../lib/ui/overlay";

const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = mac ? "⌘" : "Ctrl";

type Row = [string, string[][] | string];

const SECTIONS: [string, Row[]][] = [
  [
    "Anywhere",
    [
      ["Search and commands", [[MOD, "K"]]],
      ["This sheet", [["?"]]],
      ["Go to Today", [["g"], ["t"]]],
      ["Go to Learn", [["g"], ["l"]]],
      ["Go to Companies", [["g"], ["c"]]],
      ["Go to Mock", [["g"], ["m"]]],
      ["Go to Progress", [["g"], ["p"]]],
      ["Go to Settings", [["g"], [","]]],
      ["Toggle theme", [["shift", "D"]]],
    ],
  ],
  [
    "Lists",
    [
      ["Next / previous row", [["j"], ["k"]]],
      ["Open row", [["enter"]]],
      ["Start next up", [["s"]]],
      ["Skip for today", [["x"]]],
    ],
  ],
  [
    "Mock round",
    [
      ["Next / previous problem", [[MOD, "]"], ["["]]],
      ["Self-check yes / no", [["y"], ["n"]]],
      ["End the round", "⋯ menu, with confirm"],
    ],
  ],
  [
    "Workspace",
    [
      ["Run tests", [[MOD, "enter"]]],
      ["Format and save", [[MOD, "S"]]],
      ["Submit attempt", [[MOD, "shift", "enter"]]],
      ["Next hint", [[MOD, "H"]]],
      ["Pause timer", [[MOD, "."]]],
      ["Focus mode", [[MOD, "shift", "F"]]],
      ["Toggle problem / tests pane", [[MOD, "B"], ["J"]]],
      ["Next pane", [["F6"]]],
      ["Docs at cursor", [[MOD, "I"]]],
      ["Next failing test", [["F8"]]],
    ],
  ],
];

const keys = (groups: string[][] | string): SafeHtml =>
  typeof groups === "string" ? html`${groups}` : html`${groups.map((g, i) => html`${i ? " " : ""}${g.map((k) => html`<kbd>${k}</kbd>`)}`)}`;

const section = ([title, rows]: [string, Row[]]) =>
  html`<h3>${title}</h3><dl>${rows.map(([label, k]) => html`<dt>${label}</dt><dd>${keys(k)}</dd>`)}</dl>`;

let dlg: HTMLDialogElement | undefined;

export function openShortcuts(): void {
  if (!dlg?.isConnected) {
    dlg = document.createElement("dialog");
    dlg.className = "dlg shortcuts";
    dlg.setAttribute("aria-labelledby", "sc-title");
    const [anywhere, lists, mock, workspace] = SECTIONS as [typeof SECTIONS[0], typeof SECTIONS[0], typeof SECTIONS[0], typeof SECTIONS[0]];
    render(
      dlg,
      html`<div class="dlg-head"><h2 id="sc-title">Keyboard shortcuts</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon("x")}</button></div>
        <div class="sc-grid"><section>${section(anywhere)}</section><section>${section(lists)}${section(mock)}</section><section>${section(workspace)}</section></div>`,
    );
    dlg.querySelector("[data-close]")?.addEventListener("click", () => closeDialog(dlg ?? null));
    document.body.append(dlg);
  }
  openDialog(dlg);
}
