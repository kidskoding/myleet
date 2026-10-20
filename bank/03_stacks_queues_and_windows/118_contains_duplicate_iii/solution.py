def contains_nearby_almost_duplicate(nums: list[int], index_diff: int, value_diff: int) -> bool:
    width = value_diff + 1
    buckets: dict[int, int] = {}
    for i, x in enumerate(nums):
        key = x // width
        if key in buckets:
            return True
        if key - 1 in buckets and x - buckets[key - 1] <= value_diff:
            return True
        if key + 1 in buckets and buckets[key + 1] - x <= value_diff:
            return True
        buckets[key] = x
        if i >= index_diff:
            del buckets[nums[i - index_diff] // width]
    return False
