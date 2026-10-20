def max_sum_range_query(nums: list[int], requests: list[list[int]]) -> int:
    n = len(nums)
    diff = [0] * (n + 1)
    for start, end in requests:
        diff[start] += 1
        diff[end + 1] -= 1
    counts = []
    running = 0
    for i in range(n):
        running += diff[i]
        counts.append(running)
    total = sum(c * v for c, v in zip(sorted(counts), sorted(nums)))
    return total % (10**9 + 7)
