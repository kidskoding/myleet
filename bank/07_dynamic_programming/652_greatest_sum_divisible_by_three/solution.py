def max_sum_div_three(nums: list[int]) -> int:
    best = [0, -1, -1]
    for x in nums:
        nxt = best[:]
        for r in range(3):
            if best[r] >= 0:
                s = best[r] + x
                nxt[s % 3] = max(nxt[s % 3], s)
        best = nxt
    return best[0]
