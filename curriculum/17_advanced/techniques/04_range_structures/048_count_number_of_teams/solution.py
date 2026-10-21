class _BIT:
    def __init__(self, n: int) -> None:
        self.n = n
        self.tree = [0] * (n + 1)

    def add(self, i: int, delta: int) -> None:
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i

    def sum(self, i: int) -> int:
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i
        return total


def num_teams(rating: list[int]) -> int:
    # Problem 48: Count Number of Teams
    # Time: O(n log n)
    # Space: O(n)

    n = len(rating)
    if n < 3:
        return 0

    # Coordinate compress.
    sorted_vals = sorted(set(rating))
    rank = {v: i + 1 for i, v in enumerate(sorted_vals)}
    m = len(sorted_vals)

    left_bit = _BIT(m)
    right_bit = _BIT(m)
    for v in rating:
        right_bit.add(rank[v], 1)

    ans = 0
    for v in rating:
        r = rank[v]
        right_bit.add(r, -1)
        left_smaller = left_bit.sum(r - 1)
        left_greater = left_bit.sum(m) - left_bit.sum(r)
        right_smaller = right_bit.sum(r - 1)
        right_greater = right_bit.sum(m) - right_bit.sum(r)
        ans += left_smaller * right_greater + left_greater * right_smaller
        left_bit.add(r, 1)
    return ans
