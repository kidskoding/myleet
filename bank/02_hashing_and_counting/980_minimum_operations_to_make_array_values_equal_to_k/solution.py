def min_operations(nums: list[int], k: int) -> int:
    if min(nums) < k:
        return -1
    return len({x for x in nums if x > k})
