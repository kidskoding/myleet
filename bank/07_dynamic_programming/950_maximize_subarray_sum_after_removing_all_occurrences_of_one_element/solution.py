from collections import defaultdict

Segment = tuple[int, int, int, int]


def max_subarray_sum(nums: list[int]) -> int:
    if max(nums) <= 0:
        return max(nums)

    n = len(nums)
    size = 1
    while size < n:
        size *= 2
    empty: Segment = (0, 0, 0, 0)
    tree: list[Segment] = [empty] * (2 * size)

    def merge(left: Segment, right: Segment) -> Segment:
        total = left[0] + right[0]
        prefix = max(left[1], left[0] + right[1])
        suffix = max(right[2], right[0] + left[2])
        best = max(left[3], right[3], left[2] + right[1])
        return total, prefix, suffix, best

    def set_value(i: int, value: int) -> None:
        node = size + i
        clipped = max(value, 0)
        tree[node] = (value, clipped, clipped, clipped)
        node //= 2
        while node:
            tree[node] = merge(tree[2 * node], tree[2 * node + 1])
            node //= 2

    positions: dict[int, list[int]] = defaultdict(list)
    for i, x in enumerate(nums):
        clipped = max(x, 0)
        tree[size + i] = (x, clipped, clipped, clipped)
        positions[x].append(i)
    for node in range(size - 1, 0, -1):
        tree[node] = merge(tree[2 * node], tree[2 * node + 1])

    best = tree[1][3]
    for value, idxs in positions.items():
        if value >= 0:
            continue
        for i in idxs:
            set_value(i, 0)
        best = max(best, tree[1][3])
        for i in idxs:
            set_value(i, value)
    return best
