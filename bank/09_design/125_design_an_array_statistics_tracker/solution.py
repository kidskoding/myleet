import heapq
from bisect import bisect_left, insort
from collections import deque


class StatisticsTracker:
    def __init__(self) -> None:
        self.order: deque[int] = deque()
        self.sorted_values: list[int] = []
        self.total = 0
        self.count: dict[int, int] = {}
        self.heap: list[tuple[int, int]] = []

    def _bump(self, number: int, delta: int) -> None:
        self.count[number] = self.count.get(number, 0) + delta
        if self.count[number]:
            heapq.heappush(self.heap, (-self.count[number], number))
        else:
            del self.count[number]

    def add_number(self, number: int) -> None:
        self.order.append(number)
        insort(self.sorted_values, number)
        self.total += number
        self._bump(number, 1)

    def remove_first_added_number(self) -> None:
        number = self.order.popleft()
        self.sorted_values.pop(bisect_left(self.sorted_values, number))
        self.total -= number
        self._bump(number, -1)

    def get_mean(self) -> int:
        return self.total // len(self.order)

    def get_median(self) -> int:
        return self.sorted_values[len(self.sorted_values) // 2]

    def get_mode(self) -> int:
        while True:
            neg, number = self.heap[0]
            if self.count.get(number) == -neg:
                return number
            heapq.heappop(self.heap)
