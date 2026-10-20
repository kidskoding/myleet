def perfect_pairs(nums: list[int]) -> int:
    values = sorted(abs(x) for x in nums)
    count = 0
    left = 0
    for right, y in enumerate(values):
        while 2 * values[left] < y:
            left += 1
        count += right - left
    return count
