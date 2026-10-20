from math import gcd


def is_good_array(nums: list[int]) -> bool:
    g = 0
    for x in nums:
        g = gcd(g, x)
        if g == 1:
            return True
    return g == 1
