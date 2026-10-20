import heapq


class MaxStack:
    def __init__(self) -> None:
        self.stack: list[tuple[int, int]] = []
        self.heap: list[tuple[int, int]] = []
        self.removed: set[int] = set()
        self.counter = 0

    def push(self, x: int) -> None:
        self.stack.append((x, self.counter))
        heapq.heappush(self.heap, (-x, -self.counter))
        self.counter += 1

    def _clean_stack(self) -> None:
        while self.stack[-1][1] in self.removed:
            self.removed.discard(self.stack.pop()[1])

    def _clean_heap(self) -> None:
        while -self.heap[0][1] in self.removed:
            self.removed.discard(-heapq.heappop(self.heap)[1])

    def pop(self) -> int:
        self._clean_stack()
        x, idx = self.stack.pop()
        self.removed.add(idx)
        return x

    def top(self) -> int:
        self._clean_stack()
        return self.stack[-1][0]

    def peek_max(self) -> int:
        self._clean_heap()
        return -self.heap[0][0]

    def pop_max(self) -> int:
        self._clean_heap()
        neg_x, neg_idx = heapq.heappop(self.heap)
        self.removed.add(-neg_idx)
        return -neg_x
