import math


def min_operations(nums: list[int], nums_divide: list[int]) -> int:
    g = 0
    for x in nums_divide:
        g = math.gcd(g, x)
    nums.sort()
    for i, x in enumerate(nums):
        if g % x == 0:
            return i
    return -1
