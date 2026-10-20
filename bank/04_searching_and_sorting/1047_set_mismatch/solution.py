def find_error_nums(nums: list[int]) -> list[int]:
    seen: set[int] = set()
    dup = 0
    for x in nums:
        if x in seen:
            dup = x
        seen.add(x)
    n = len(nums)
    missing = n * (n + 1) // 2 - (sum(nums) - dup)
    return [dup, missing]
