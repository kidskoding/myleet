from collections import deque


class ZigzagIterator:
    def __init__(self, v1: list[int], v2: list[int]) -> None:
        self.queue: deque[tuple[list[int], int]] = deque((v, 0) for v in (v1, v2) if v)

    def next(self) -> int:
        values, i = self.queue.popleft()
        if i + 1 < len(values):
            self.queue.append((values, i + 1))
        return values[i]

    def has_next(self) -> bool:
        return bool(self.queue)
