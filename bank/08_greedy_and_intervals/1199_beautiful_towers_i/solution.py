def maximum_sum_of_heights(max_heights: list[int]) -> int:
    n = len(max_heights)
    ans = 0
    for i, peak in enumerate(max_heights):
        total = peak
        h = peak
        for j in range(i - 1, -1, -1):
            h = min(h, max_heights[j])
            total += h
        h = peak
        for j in range(i + 1, n):
            h = min(h, max_heights[j])
            total += h
        ans = max(ans, total)
    return ans
