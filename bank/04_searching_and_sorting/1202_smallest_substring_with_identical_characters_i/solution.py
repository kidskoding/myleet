from itertools import groupby


def min_length(s: str, num_ops: int) -> int:
    runs = [len(list(group)) for _, group in groupby(s)]

    def feasible(m: int) -> bool:
        if m == 1:
            mismatches = sum(int(ch) != i % 2 for i, ch in enumerate(s))
            return min(mismatches, len(s) - mismatches) <= num_ops
        return sum(run // (m + 1) for run in runs) <= num_ops

    lo, hi = 1, len(s)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
