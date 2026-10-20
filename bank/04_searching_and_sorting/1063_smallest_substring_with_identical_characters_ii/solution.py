def min_length(s: str, num_ops: int) -> int:
    n = len(s)
    runs: list[int] = []
    count = 1
    for i in range(1, n):
        if s[i] == s[i - 1]:
            count += 1
        else:
            runs.append(count)
            count = 1
    runs.append(count)

    def flips(limit: int) -> int:
        if limit == 1:
            mismatches = sum(1 for i, ch in enumerate(s) if ch != "01"[i % 2])
            return min(mismatches, n - mismatches)
        return sum(r // (limit + 1) for r in runs)

    lo, hi = 1, n
    while lo < hi:
        mid = (lo + hi) // 2
        if flips(mid) <= num_ops:
            hi = mid
        else:
            lo = mid + 1
    return lo
