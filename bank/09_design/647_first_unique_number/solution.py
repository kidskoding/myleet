from collections import Counter, deque


class FirstUnique:
    def __init__(self, nums: list[int]) -> None:
        self.counts: Counter[int] = Counter()
        self.queue: deque[int] = deque()
        for value in nums:
            self.add(value)

    def show_first_unique(self) -> int:
        while self.queue and self.counts[self.queue[0]] > 1:
            self.queue.popleft()
        return self.queue[0] if self.queue else -1

    def add(self, value: int) -> None:
        self.counts[value] += 1
        if self.counts[value] == 1:
            self.queue.append(value)
