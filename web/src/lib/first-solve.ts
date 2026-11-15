// After a guest's first passing submit, offer the account once. Only on a problem page,
// and only after the result has had a moment, so it never lands mid-solve.
import { requireAccount } from "./access";
import { signedIn } from "./account";

const KEY = "myleet:first-solve-offered";

export function firstSolvePrompt(): void {
  if (signedIn() || !location.pathname.startsWith("/p/")) return;
  try {
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, "1");
  } catch {
    return;
  }
  setTimeout(() => requireAccount("first-solve"), 1500);
}
