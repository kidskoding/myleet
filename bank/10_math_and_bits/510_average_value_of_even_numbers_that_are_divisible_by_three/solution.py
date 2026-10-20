def average_value(nums: list[int]) -> int:
    picked = [x for x in nums if x % 6 == 0]
    return sum(picked) // len(picked) if picked else 0
