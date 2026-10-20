def max_product(nums: list[int]) -> int:
    first = second = 0
    for x in nums:
        if x > first:
            first, second = x, first
        elif x > second:
            second = x
    return (first - 1) * (second - 1)
