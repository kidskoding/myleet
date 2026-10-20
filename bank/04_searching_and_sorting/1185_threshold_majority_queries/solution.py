from collections import defaultdict
from math import isqrt


def subarray_majority(nums: list[int], queries: list[list[int]]) -> list[int]:
    n = len(nums)
    values = sorted(set(nums))
    rank = {v: i for i, v in enumerate(values)}
    a = [rank[v] for v in nums]
    block = max(1, isqrt(n))
    count = [0] * len(values)
    answer = [-1] * len(queries)

    def better(x: int, best_freq: int, best_val: int) -> bool:
        return count[x] > best_freq or (count[x] == best_freq and x < best_val)

    by_block: dict[int, list[int]] = defaultdict(list)
    for qi, (lo, hi, threshold) in enumerate(queries):
        if lo // block != hi // block:
            by_block[lo // block].append(qi)
            continue
        best_freq, best_val = 0, -1
        for i in range(lo, hi + 1):
            count[a[i]] += 1
            if better(a[i], best_freq, best_val):
                best_freq, best_val = count[a[i]], a[i]
        for i in range(lo, hi + 1):
            count[a[i]] -= 1
        answer[qi] = values[best_val] if best_freq >= threshold else -1

    for b, group in by_block.items():
        group.sort(key=lambda qi: queries[qi][1])
        base = (b + 1) * block
        right = base - 1
        best_freq, best_val = 0, -1
        for qi in group:
            lo, hi, threshold = queries[qi]
            while right < hi:
                right += 1
                count[a[right]] += 1
                if better(a[right], best_freq, best_val):
                    best_freq, best_val = count[a[right]], a[right]
            saved = best_freq, best_val
            for i in range(lo, base):
                count[a[i]] += 1
                if better(a[i], best_freq, best_val):
                    best_freq, best_val = count[a[i]], a[i]
            answer[qi] = values[best_val] if best_freq >= threshold else -1
            for i in range(lo, base):
                count[a[i]] -= 1
            best_freq, best_val = saved
        for i in range(base, right + 1):
            count[a[i]] -= 1
    return answer
