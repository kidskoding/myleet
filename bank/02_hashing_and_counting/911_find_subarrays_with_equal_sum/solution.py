def find_subarrays(nums: list[int]) -> bool:
    seen = set()
    for a, b in zip(nums, nums[1:]):
        if a + b in seen:
            return True
        seen.add(a + b)
    return False
