def minimum_cost(nums: list[int]) -> int:
    first = second = float("inf")
    for x in nums[1:]:
        if x < first:
            first, second = x, first
        elif x < second:
            second = x
    return nums[0] + int(first) + int(second)
