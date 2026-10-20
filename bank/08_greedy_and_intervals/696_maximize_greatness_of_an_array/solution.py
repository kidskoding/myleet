def maximize_greatness(nums: list[int]) -> int:
    ordered = sorted(nums)
    matched = 0
    for x in ordered:
        if x > ordered[matched]:
            matched += 1
    return matched
