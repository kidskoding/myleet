def maximum_gap(nums: list[int]) -> int:
    n = len(nums)
    if n < 2:
        return 0
    low, high = min(nums), max(nums)
    if low == high:
        return 0
    width = max(1, (high - low) // (n - 1))
    count = (high - low) // width + 1
    bucket_min: list[int | None] = [None] * count
    bucket_max: list[int | None] = [None] * count
    for x in nums:
        b = (x - low) // width
        current_min, current_max = bucket_min[b], bucket_max[b]
        bucket_min[b] = x if current_min is None else min(current_min, x)
        bucket_max[b] = x if current_max is None else max(current_max, x)
    best = 0
    previous = low
    for b in range(count):
        current_min, current_max = bucket_min[b], bucket_max[b]
        if current_min is None or current_max is None:
            continue
        best = max(best, current_min - previous)
        previous = current_max
    return best
