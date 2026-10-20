def maximum_or(nums: list[int], k: int) -> int:
    n = len(nums)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] | nums[i]
    best = prefix = 0
    for i, x in enumerate(nums):
        best = max(best, prefix | (x << k) | suffix[i + 1])
        prefix |= x
    return best
