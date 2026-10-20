from bisect import bisect_left, bisect_right
from collections import defaultdict


def _merge(a: tuple[int, int], b: tuple[int, int]) -> tuple[int, int]:
    if a[0] == b[0]:
        return (a[0], a[1] + b[1])
    if a[1] >= b[1]:
        return (a[0], a[1] - b[1])
    return (b[0], b[1] - a[1])


class MajorityChecker:
    def __init__(self, arr: list[int]) -> None:
        self.n = len(arr)
        self.tree: list[tuple[int, int]] = [(0, 0)] * (4 * self.n)
        self.positions: dict[int, list[int]] = defaultdict(list)
        for i, value in enumerate(arr):
            self.positions[value].append(i)
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr: list[int], node: int, lo: int, hi: int) -> None:
        if lo == hi:
            self.tree[node] = (arr[lo], 1)
            return
        mid = (lo + hi) // 2
        self._build(arr, 2 * node, lo, mid)
        self._build(arr, 2 * node + 1, mid + 1, hi)
        self.tree[node] = _merge(self.tree[2 * node], self.tree[2 * node + 1])

    def _query(self, node: int, lo: int, hi: int, left: int, right: int) -> tuple[int, int]:
        if right < lo or hi < left:
            return (0, 0)
        if left <= lo and hi <= right:
            return self.tree[node]
        mid = (lo + hi) // 2
        return _merge(
            self._query(2 * node, lo, mid, left, right),
            self._query(2 * node + 1, mid + 1, hi, left, right),
        )

    def query(self, left: int, right: int, threshold: int) -> int:
        candidate, _ = self._query(1, 0, self.n - 1, left, right)
        spots = self.positions.get(candidate, [])
        freq = bisect_right(spots, right) - bisect_left(spots, left)
        return candidate if freq >= threshold else -1
