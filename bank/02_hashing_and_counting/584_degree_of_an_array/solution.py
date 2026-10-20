def find_shortest_sub_array(nums: list[int]) -> int:
    first: dict[int, int] = {}
    count: dict[int, int] = {}
    best_count = 0
    best_len = 0
    for i, x in enumerate(nums):
        first.setdefault(x, i)
        count[x] = count.get(x, 0) + 1
        span = i - first[x] + 1
        if count[x] > best_count or (count[x] == best_count and span < best_len):
            best_count, best_len = count[x], span
    return best_len
