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


def create_sorted_array(instructions: list[int]) -> int:
    # Problem 47: Create Sorted Array through Instructions
    # Time: O(n log V)
    # Space: O(V)

    mod = 10**9 + 7
    if not instructions:
        return 0
    max_v = max(instructions)
    bit = _BIT(max_v)
    cost = 0
    for i, x in enumerate(instructions):
        less = bit.sum(x - 1)
        greater = i - bit.sum(x)
        cost = (cost + min(less, greater)) % mod
        bit.add(x, 1)
    return cost
