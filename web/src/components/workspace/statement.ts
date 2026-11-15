// Problem statements: the problem's own `prompt` (rendered at build time), or LeetCode's
// statement through the Worker (`GET /api/statement?slug=`), rendered as Literata prose.

export type StatementResult =
  | { kind: "ok"; html: string }
  | { kind: "premium" }
  | { kind: "none" }
  | { kind: "offline" }
  | { kind: "error" };

/** `two-sum` from `https://leetcode.com/problems/two-sum/`. */
export function leetcodeSlug(url: string): string | null {
  return /leetcode\.com\/problems\/([a-z0-9-]+)/i.exec(url)?.[1] ?? null;
}

export async function fetchStatement(slug: string): Promise<StatementResult> {
  try {
    const res = await fetch(`/api/statement?slug=${encodeURIComponent(slug)}`, { credentials: "same-origin" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return { kind: "error" };
    const body = (await res.json()) as { status: string; markdown: string };
    if (body.status === "premium") return { kind: "premium" };
    if (body.status === "none") return { kind: "none" };
    if (body.status === "offline" || !body.markdown) return { kind: "offline" };
    const { renderMarkdown } = await import("./markdown");
    return { kind: "ok", html: renderMarkdown(body.markdown) };
  } catch {
    return { kind: navigator.onLine === false ? "offline" : "error" };
  }
}
