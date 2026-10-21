def array_nesting(nums: list[int]) -> int:
    n = len(nums)
    seen = [False] * n
    best = 0
    for i in range(n):
        if seen[i]:
            continue
        length = 0
        j = i
        while not seen[j]:
            seen[j] = True
            j = nums[j]
            length += 1
        best = max(best, length)
    return best
