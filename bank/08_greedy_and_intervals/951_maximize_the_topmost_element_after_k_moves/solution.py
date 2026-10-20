def maximum_top(nums: list[int], k: int) -> int:
    n = len(nums)
    if k == 0:
        return nums[0]
    if n == 1:
        return -1 if k % 2 == 1 else nums[0]
    best = max(nums[: k - 1]) if k > 1 else -1
    if k < n:
        best = max(best, nums[k])
    return best
