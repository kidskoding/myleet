def max_div_score(nums: list[int], divisors: list[int]) -> int:
    return min(divisors, key=lambda d: (-sum(1 for x in nums if x % d == 0), d))
