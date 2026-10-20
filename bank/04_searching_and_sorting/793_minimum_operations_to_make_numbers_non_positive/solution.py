def min_operations(nums: list[int], x: int, y: int) -> int:
    def feasible(t: int) -> bool:
        extra = 0
        for v in nums:
            left = v - t * y
            if left > 0:
                extra += (left + x - y - 1) // (x - y)
                if extra > t:
                    return False
        return True

    lo, hi = 0, (max(nums) + y - 1) // y
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
