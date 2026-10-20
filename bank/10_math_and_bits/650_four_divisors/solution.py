def sum_four_divisors(nums: list[int]) -> int:
    total = 0
    for x in nums:
        divisors: set[int] = set()
        d = 1
        while d * d <= x and len(divisors) <= 4:
            if x % d == 0:
                divisors.add(d)
                divisors.add(x // d)
            d += 1
        if len(divisors) == 4:
            total += sum(divisors)
    return total
