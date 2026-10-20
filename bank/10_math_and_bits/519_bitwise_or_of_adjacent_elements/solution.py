def or_array(nums: list[int]) -> list[int]:
    return [a | b for a, b in zip(nums, nums[1:])]
