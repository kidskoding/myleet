def count_subarrays(nums: list[int], k: int) -> int:
    top = max(nums)
    left = 0
    inside = 0
    total = 0
    for x in nums:
        if x == top:
            inside += 1
        while inside >= k:
            if nums[left] == top:
                inside -= 1
            left += 1
        total += left
    return total
