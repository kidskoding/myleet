def find_missing_ranges(nums: list[int], lower: int, upper: int) -> list[list[int]]:
    result = []
    prev = lower - 1
    for cur in [*nums, upper + 1]:
        if cur - prev >= 2:
            result.append([prev + 1, cur - 1])
        prev = cur
    return result
