class TextEditor:
    def __init__(self) -> None:
        self.left: list[str] = []
        self.right: list[str] = []

    def add_text(self, text: str) -> None:
        self.left.extend(text)

    def delete_text(self, k: int) -> int:
        removed = min(k, len(self.left))
        del self.left[len(self.left) - removed :]
        return removed

    def cursor_left(self, k: int) -> str:
        for _ in range(min(k, len(self.left))):
            self.right.append(self.left.pop())
        return "".join(self.left[-10:])

    def cursor_right(self, k: int) -> str:
        for _ in range(min(k, len(self.right))):
            self.left.append(self.right.pop())
        return "".join(self.left[-10:])
