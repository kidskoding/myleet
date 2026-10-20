from __future__ import annotations


class _Node:
    def __init__(self) -> None:
        self.children: dict[str, _Node] = {}
        self.content: str | None = None


class FileSystem:
    def __init__(self) -> None:
        self.root = _Node()

    def _walk(self, path: str) -> _Node:
        node = self.root
        for part in path.split("/"):
            if part:
                node = node.children.setdefault(part, _Node())
        return node

    def ls(self, path: str) -> list[str]:
        node = self._walk(path)
        if node.content is not None:
            return [path.rsplit("/", 1)[-1]]
        return sorted(node.children)

    def mkdir(self, path: str) -> None:
        self._walk(path)

    def add_content_to_file(self, file_path: str, content: str) -> None:
        node = self._walk(file_path)
        node.content = (node.content or "") + content

    def read_content_from_file(self, file_path: str) -> str:
        return self._walk(file_path).content or ""
