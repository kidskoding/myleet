def result_array(nums: list[int], k: int, queries: list[list[int]]) -> list[int]:
    n = len(nums)
    size = 1
    while size < n:
        size *= 2
    identity = (1 % k, (0,) * k)
    tree = [identity] * (2 * size)

    def leaf(value: int) -> tuple[int, tuple[int, ...]]:
        counts = [0] * k
        counts[value % k] = 1
        return value % k, tuple(counts)

    def merge(left: tuple[int, tuple[int, ...]], right: tuple[int, tuple[int, ...]]) -> tuple[int, tuple[int, ...]]:
        left_prod, left_counts = left
        right_prod, right_counts = right
        counts = list(left_counts)
        for rem, count in enumerate(right_counts):
            if count:
                counts[left_prod * rem % k] += count
        return left_prod * right_prod % k, tuple(counts)

    for i, value in enumerate(nums):
        tree[size + i] = leaf(value)
    for node in range(size - 1, 0, -1):
        tree[node] = merge(tree[2 * node], tree[2 * node + 1])

    result = []
    for index, value, start, x in queries:
        node = size + index
        tree[node] = leaf(value)
        node //= 2
        while node:
            tree[node] = merge(tree[2 * node], tree[2 * node + 1])
            node //= 2
        lo, hi = start + size, n - 1 + size + 1
        left_part, right_part = identity, identity
        while lo < hi:
            if lo & 1:
                left_part = merge(left_part, tree[lo])
                lo += 1
            if hi & 1:
                hi -= 1
                right_part = merge(tree[hi], right_part)
            lo //= 2
            hi //= 2
        result.append(merge(left_part, right_part)[1][x])
    return result
