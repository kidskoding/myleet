def preimage_size_fzf(k: int) -> int:
    def zeros(x: int) -> int:
        count = 0
        while x:
            x //= 5
            count += x
        return count

    lo, hi = 0, 5 * k + 5
    while lo < hi:
        mid = (lo + hi) // 2
        if zeros(mid) < k:
            lo = mid + 1
        else:
            hi = mid
    return 5 if zeros(lo) == k else 0
