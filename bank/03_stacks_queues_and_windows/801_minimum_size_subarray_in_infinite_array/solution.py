def min_size_subarray(nums: list[int], target: int) -> int:
    n = len(nums)
    total = sum(nums)
    full, rest = divmod(target, total)
    if rest == 0:
        return full * n
    doubled = nums + nums
    best = len(doubled) + 1
    window = left = 0
    for right, value in enumerate(doubled):
        window += value
        while window > rest:
            window -= doubled[left]
            left += 1
        if window == rest:
            best = min(best, right - left + 1)
    return -1 if best > len(doubled) else full * n + best
