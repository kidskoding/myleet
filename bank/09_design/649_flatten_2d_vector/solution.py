class Vector2D:
    def __init__(self, vec: list[list[int]]) -> None:
        self.vec = vec
        self.row = 0
        self.col = 0

    def _skip_empty(self) -> None:
        while self.row < len(self.vec) and self.col == len(self.vec[self.row]):
            self.row += 1
            self.col = 0

    def next(self) -> int:
        self._skip_empty()
        value = self.vec[self.row][self.col]
        self.col += 1
        return value

    def has_next(self) -> bool:
        self._skip_empty()
        return self.row < len(self.vec)
