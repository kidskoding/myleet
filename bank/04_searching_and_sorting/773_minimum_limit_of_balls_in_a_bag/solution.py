def minimum_size(nums: list[int], max_operations: int) -> int:
    lo, hi = 1, max(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if sum((x - 1) // mid for x in nums) <= max_operations:
            hi = mid
        else:
            lo = mid + 1
    return lo
