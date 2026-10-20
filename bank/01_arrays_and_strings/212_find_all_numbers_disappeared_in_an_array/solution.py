def find_disappeared_numbers(nums: list[int]) -> list[int]:
    for value in nums:
        index = abs(value) - 1
        if nums[index] > 0:
            nums[index] = -nums[index]
    return [i + 1 for i, value in enumerate(nums) if value > 0]
