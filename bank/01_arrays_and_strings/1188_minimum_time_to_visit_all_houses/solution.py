import itertools


def min_total_time(forward: list[int], backward: list[int], queries: list[int]) -> int:
    summ = sum(backward)
    ans = 0
    pos = 0
    prefix_f = [0] + list(itertools.accumulate(forward))
    prefix_b = list(itertools.accumulate(backward)) + [0]
    for q in queries:
        right = int(q < pos) * prefix_f[-1] + prefix_f[q] - prefix_f[pos]
        left = int(q > pos) * summ + prefix_b[pos] - prefix_b[q]
        ans += min(left, right)
        pos = q
    return ans
