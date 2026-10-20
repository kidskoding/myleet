def count_max_or_subsets(nums: list[int]) -> int:
    target = 0
    for x in nums:
        target |= x
    counts = {0: 1}
    for x in nums:
        nxt = dict(counts)
        for value, ways in counts.items():
            nxt[value | x] = nxt.get(value | x, 0) + ways
        counts = nxt
    return counts[target]
