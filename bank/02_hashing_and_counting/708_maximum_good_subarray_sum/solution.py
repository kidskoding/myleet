def maximum_subarray_sum(nums: list[int], k: int) -> int:
    best_prefix: dict[int, int] = {}
    best: int | None = None
    prefix = 0
    for x in nums:
        if x not in best_prefix or prefix < best_prefix[x]:
            best_prefix[x] = prefix
        prefix += x
        for start_value in (x - k, x + k):
            if start_value in best_prefix:
                candidate = prefix - best_prefix[start_value]
                if best is None or candidate > best:
                    best = candidate
    return 0 if best is None else best
