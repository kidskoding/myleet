def min_operations_to_make_median_k(nums: list[int], k: int) -> int:
    nums = sorted(nums)
    mid = len(nums) // 2
    ops = 0
    for i in range(mid + 1):
        if nums[i] > k:
            ops += nums[i] - k
    for i in range(mid, len(nums)):
        if nums[i] < k:
            ops += k - nums[i]
    return ops
