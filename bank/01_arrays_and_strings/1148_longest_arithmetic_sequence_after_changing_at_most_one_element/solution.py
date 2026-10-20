def longest_arithmetic(nums: list[int]) -> int:
    n = len(nums)
    if n <= 3:
        return n
    ending = [1] * n
    for i in range(1, n):
        if i >= 2 and nums[i] - nums[i - 1] == nums[i - 1] - nums[i - 2]:
            ending[i] = ending[i - 1] + 1
        else:
            ending[i] = 2
    starting = [1] * n
    for i in range(n - 2, -1, -1):
        if i <= n - 3 and nums[i + 1] - nums[i] == nums[i + 2] - nums[i + 1]:
            starting[i] = starting[i + 1] + 1
        else:
            starting[i] = 2

    best = max(ending)
    for i in range(n):
        if i + 1 < n:
            best = max(best, ending[i] + 1)
        if i > 0:
            best = max(best, starting[i] + 1)

    for i in range(1, n - 1):
        gap = nums[i + 1] - nums[i - 1]
        if gap % 2:
            continue
        d = gap // 2
        left = ending[i - 1] if i >= 2 and nums[i - 1] - nums[i - 2] == d else 1
        right = starting[i + 1] if i + 2 < n and nums[i + 2] - nums[i + 1] == d else 1
        best = max(best, left + 1 + right)
    return min(best, n)
