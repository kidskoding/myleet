def minimum_array_length(nums: list[int]) -> int:
    smallest = min(nums)
    if any(x % smallest for x in nums):
        return 1
    return (nums.count(smallest) + 1) // 2
