from bisect import bisect_left, bisect_right


class CountIntervals:
    def __init__(self) -> None:
        self.starts: list[int] = []
        self.ends: list[int] = []
        self.total = 0

    def add(self, left: int, right: int) -> None:
        i = bisect_left(self.ends, left)
        j = bisect_right(self.starts, right)
        for k in range(i, j):
            left = min(left, self.starts[k])
            right = max(right, self.ends[k])
            self.total -= self.ends[k] - self.starts[k] + 1
        self.starts[i:j] = [left]
        self.ends[i:j] = [right]
        self.total += right - left + 1

    def count(self) -> int:
        return self.total
