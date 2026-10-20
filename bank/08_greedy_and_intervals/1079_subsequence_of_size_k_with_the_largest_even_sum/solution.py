def largest_even_sum(nums: list[int], k: int) -> int:
    a = sorted(nums, reverse=True)
    chosen, rest = a[:k], a[k:]
    total = sum(chosen)
    if total % 2 == 0:
        return total
    best = -1
    min_odd_in = min((x for x in chosen if x % 2), default=None)
    min_even_in = min((x for x in chosen if x % 2 == 0), default=None)
    max_even_out = max((x for x in rest if x % 2 == 0), default=None)
    max_odd_out = max((x for x in rest if x % 2), default=None)
    if min_odd_in is not None and max_even_out is not None:
        best = max(best, total - min_odd_in + max_even_out)
    if min_even_in is not None and max_odd_out is not None:
        best = max(best, total - min_even_in + max_odd_out)
    return best
