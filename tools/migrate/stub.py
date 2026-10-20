"""Replace function and method bodies with `raise NotImplementedError`.

The comment block between a `def` line and its first statement is kept, so the
`# Problem N:` / `# Key idea:` lines survive. Filled-in `# Time:` and `# Space:`
answers are blanked so complexity gets re-derived on the redo.
"""

from __future__ import annotations

import ast

FuncDef = ast.FunctionDef | ast.AsyncFunctionDef


def top_level_functions(tree: ast.Module) -> list[FuncDef]:
    """Module-level functions and methods of module-level classes.

    Nested (helper) functions are excluded: they belong to the body being
    replaced, and rewriting them separately corrupts the outer ranges.
    """
    found: list[FuncDef] = []
    for node in tree.body:
        if isinstance(node, FuncDef):
            found.append(node)
        elif isinstance(node, ast.ClassDef):
            found.extend(child for child in node.body if isinstance(child, FuncDef))
    return found


def _raises_not_implemented(stmt: ast.stmt) -> bool:
    if not isinstance(stmt, ast.Raise) or stmt.exc is None:
        return False
    exc = stmt.exc.func if isinstance(stmt.exc, ast.Call) else stmt.exc
    return isinstance(exc, ast.Name) and exc.id == "NotImplementedError"


def is_stub(node: ast.stmt) -> bool:
    """A function whose only statement raises NotImplementedError, or a class whose methods all are."""
    if isinstance(node, FuncDef):
        body = node.body
        if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
            body = body[1:]
        return len(body) == 1 and _raises_not_implemented(body[0])
    if isinstance(node, ast.ClassDef):
        methods = [child for child in node.body if isinstance(child, FuncDef)]
        return bool(methods) and all(is_stub(m) for m in methods)
    return False


def stub_source(src: str) -> str:
    lines = src.split("\n")
    tree = ast.parse(src)
    # Rewrite bottom-up so earlier line numbers stay valid.
    for func in sorted(top_level_functions(tree), key=lambda f: f.lineno, reverse=True):
        if is_stub(func):
            continue
        header_end = func.body[0].lineno - 1  # comments live in def..first-statement
        body_end = func.end_lineno
        indent = " " * (func.col_offset + 4)
        lines[header_end:body_end] = ["", f"{indent}raise NotImplementedError"]
        for i in range(func.lineno, header_end):
            stripped = lines[i].strip()
            if stripped.startswith("# Time:") or stripped.startswith("# Space:"):
                lines[i] = f"{indent}{stripped.split(':', 1)[0]}:"
    return "\n".join(lines)
