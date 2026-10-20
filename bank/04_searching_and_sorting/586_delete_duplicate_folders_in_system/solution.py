from __future__ import annotations

from collections import Counter


class _Folder:
    def __init__(self) -> None:
        self.children: dict[str, _Folder] = {}
        self.key = ""


def delete_duplicate_folder(paths: list[list[str]]) -> list[list[str]]:
    root = _Folder()
    for path in paths:
        node = root
        for name in path:
            node = node.children.setdefault(name, _Folder())
    seen: Counter[str] = Counter()

    def serialize(node: _Folder) -> str:
        node.key = "".join(f"{name}({serialize(child)})" for name, child in sorted(node.children.items()))
        if node.key:
            seen[node.key] += 1
        return node.key

    serialize(root)
    result: list[list[str]] = []

    def collect(node: _Folder, path: list[str]) -> None:
        for name, child in node.children.items():
            if child.key and seen[child.key] > 1:
                continue
            path.append(name)
            result.append(list(path))
            collect(child, path)
            path.pop()

    collect(root, [])
    return result
