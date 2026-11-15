// The shared sign-up sheet: one dialog for every feature that needs an account. A native
// modal <dialog> gives the focus trap and Esc; the .dlg styles slide it up on phones.
import { dismissPrompt } from "../access";
import { html, render } from "./html";
import { closeDialog, openDialog } from "./overlay";

let dlg: HTMLDialogElement | undefined;

export function openSignupPrompt(reason: string, signupUrl: string, signinUrl: string): void {
  if (!dlg?.isConnected) {
    dlg = document.createElement("dialog");
    dlg.className = "dlg signup-prompt";
    dlg.setAttribute("aria-labelledby", "sp-h");
    dlg.setAttribute("aria-describedby", "sp-d");
    document.body.append(dlg);
  }
  const d = dlg;
  render(
    d,
    html`<div class="dlg-head"><h2 id="sp-h" tabindex="-1">Keep this with a free account</h2></div>
      <div class="dlg-body"><p id="sp-d">${reason}</p></div>
      <div class="dlg-actions">
        <button class="btn btn-ghost" type="button" data-not-now>Not now</button>
        <a class="btn btn-secondary" href="${signinUrl}">Sign in</a>
        <a class="btn btn-primary" href="${signupUrl}" data-sp-up>Sign up for free</a>
      </div>`,
  );
  d.querySelector("[data-not-now]")?.addEventListener("click", () => closeDialog(d));
  d.addEventListener("close", dismissPrompt, { once: true });
  openDialog(d);
  d.querySelector<HTMLElement>("[data-sp-up]")?.focus();
}
