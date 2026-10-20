def max_alternating_sum(nums: list[int], k: int) -> int:
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(nums)))}
    m = len(ranks)
    n = len(nums)
    below = [0] * (m + 1)
    above = [0] * (m + 1)

    def update(tree: list[int], i: int, value: int) -> None:
        while i <= m:
            tree[i] = max(tree[i], value)
            i += i & -i

    def query(tree: list[int], i: int) -> int:
        result = 0
        while i > 0:
            result = max(result, tree[i])
            i -= i & -i
        return result

    rose = [0] * n
    fell = [0] * n
    best = 0
    for i, value in enumerate(nums):
        j = i - k
        if j >= 0:
            update(below, ranks[nums[j]], fell[j])
            update(above, m + 1 - ranks[nums[j]], rose[j])
        r = ranks[value]
        rose[i] = value + query(below, r - 1)
        fell[i] = value + query(above, m - r)
        best = max(best, rose[i], fell[i])
    return best
