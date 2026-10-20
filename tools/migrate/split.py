"""Split one multi-problem file and its test file into per-problem sources."""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field

from tools.migrate.strip_key_idea import strip_key_idea
from tools.migrate.stub import is_stub, stub_source

__all__ = ["SplitProblem", "is_stub", "split_file", "stub_source"]

KEY_IDEA_RE = re.compile(r"#\s*Key idea:\s*(.+)")


@dataclass
class SplitProblem:
    symbols: list[str]
    starter: str
    solved: str | None
    tests: str
    test_names: list[str] = field(default_factory=list)
    key_idea: str | None = None


@dataclass
class _Def:
    name: str
    node: ast.stmt
    source: str
    order: int


def _segment(src: str, node: ast.stmt) -> str:
    lines = src.split("\n")
    start = min([node.lineno] + [d.lineno for d in getattr(node, "decorator_list", [])])
    return "\n".join(lines[start - 1 : node.end_lineno])


def _defined_names(node: ast.stmt) -> list[str]:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return [node.name]
    if isinstance(node, ast.Assign):
        return [t.id for t in node.targets if isinstance(t, ast.Name)]
    if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        return [node.target.id]
    return []


def _names_used(node: ast.AST) -> set[str]:
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}


def _collect(src: str) -> tuple[list[ast.stmt], dict[str, _Def]]:
    tree = ast.parse(src)
    imports: list[ast.stmt] = []
    defs: dict[str, _Def] = {}
    for order, node in enumerate(tree.body):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            imports.append(node)
            continue
        for name in _defined_names(node):
            defs[name] = _Def(name, node, _segment(src, node), order)
    return imports, defs


def _closure(start: set[str], defs: dict[str, _Def]) -> set[str]:
    seen: set[str] = set()
    todo = [n for n in start if n in defs]
    while todo:
        name = todo.pop()
        if name in seen:
            continue
        seen.add(name)
        todo.extend(n for n in _names_used(defs[name].node) if n in defs and n not in seen)
    return seen


def _join(blocks: list[str]) -> str:
    return "\n\n\n".join(b.strip("\n") for b in blocks if b.strip()) + "\n"


def split_file(
    problem_src: str,
    test_src: str,
    problems: list[list[str]],
    current_module: str,
    helper_imports: dict[str, str],
) -> list[SplitProblem]:
    """Return one SplitProblem per entry in `problems` (each a list of solved symbol names).

    `helper_imports` maps names imported from *other* problem files to the `_lib` module
    that provides a trusted version (e.g. `preorder_traversal` -> `tree_helpers`).
    """
    p_imports, p_defs = _collect(problem_src)
    p_import_src = "\n".join(ast.get_source_segment(problem_src, n) or "" for n in p_imports)
    owner = {sym: i for i, syms in enumerate(problems) for sym in syms}

    t_tree = ast.parse(test_src)
    kept_test_imports: list[str] = []
    for node in t_tree.body:
        if isinstance(node, ast.ImportFrom) and (node.module or "").startswith("problem_set."):
            module = (node.module or "").split(".", 1)[1]
            if module != current_module:
                for alias in node.names:
                    if alias.name not in helper_imports:
                        raise ValueError(f"no _lib helper for {alias.name} imported from {module}")
            continue
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            kept_test_imports.append(ast.get_source_segment(test_src, node) or "")
    _, t_defs = _collect(test_src)
    tests = [d for d in t_defs.values() if isinstance(d.node, ast.FunctionDef) and d.name.startswith("test_")]
    t_helpers = {name: d for name, d in t_defs.items() if not name.startswith("test_")}

    def first_owner(names_in_order: list[str]) -> int | None:
        for name in names_in_order:
            if name in owner:
                return owner[name]
        return None

    routed: dict[int, list[_Def]] = {i: [] for i in range(len(problems))}
    for test in sorted(tests, key=lambda d: d.order):
        direct = [
            n.id
            for n in sorted((n for n in ast.walk(test.node) if isinstance(n, ast.Name)), key=lambda n: (n.lineno, n.col_offset))
        ]
        index = first_owner(direct)
        if index is None:
            via_helpers = _closure(set(direct), t_helpers)
            index = first_owner([n for h in sorted(via_helpers) for n in sorted(_names_used(t_helpers[h].node))])
        routed[0 if index is None else index].append(test)

    results: list[SplitProblem] = []
    for i, symbols in enumerate(problems):
        my_tests = routed[i]
        helper_names = _closure({n for t in my_tests for n in _names_used(t.node)}, t_helpers)
        test_refs = {n for t in my_tests for n in _names_used(t.node)}
        test_refs |= {n for h in helper_names for n in _names_used(t_helpers[h].node)}

        from_solution = sorted((test_refs & set(p_defs)) | set(symbols))
        needed = _closure(set(from_solution), p_defs)
        support = [p_defs[n] for n in needed if n not in symbols]
        own = [p_defs[s] for s in symbols if s in p_defs]
        ordered = sorted({d.order: d for d in support + own}.values(), key=lambda d: d.order)

        starter_blocks = [p_import_src] + [stub_source(d.source) if d.name in symbols else d.source for d in ordered]
        solved = None
        if any(not is_stub(d.node) for d in own):
            solved = _join([p_import_src] + [d.source for d in ordered])

        lib_imports: dict[str, list[str]] = {}
        for name in sorted((test_refs & set(helper_imports)) - set(from_solution)):
            lib_imports.setdefault(helper_imports[name], []).append(name)
        import_lines = [line for line in kept_test_imports]
        import_lines += [f"from {mod} import {', '.join(names)}" for mod, names in sorted(lib_imports.items())]
        import_lines.append(f"from solution import {', '.join(from_solution)}")
        test_defs = sorted([t_helpers[h] for h in helper_names] + my_tests, key=lambda d: d.order)

        key_idea = None
        if own:
            match = KEY_IDEA_RE.search(own[0].source)
            key_idea = match.group(1).strip() if match else None

        results.append(
            SplitProblem(
                symbols=symbols,
                starter=strip_key_idea(_join(starter_blocks)),
                solved=solved,
                tests=_join(["\n".join(import_lines)] + [d.source for d in test_defs]),
                test_names=[t.name for t in my_tests],
                key_idea=key_idea,
            )
        )
    return results
