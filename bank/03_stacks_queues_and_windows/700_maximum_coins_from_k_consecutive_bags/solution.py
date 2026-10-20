def _anchored_at_starts(segments: list[tuple[int, int, int]], k: int) -> int:
    best = 0
    covered = 0
    right = 0
    for left in range(len(segments)):
        window_end = segments[left][0] + k - 1
        while right < len(segments) and segments[right][1] <= window_end:
            lo, hi, c = segments[right]
            covered += (hi - lo + 1) * c
            right += 1
        partial = 0
        if right < len(segments) and segments[right][0] <= window_end:
            partial = (window_end - segments[right][0] + 1) * segments[right][2]
        best = max(best, covered + partial)
        if right > left:
            lo, hi, c = segments[left]
            covered -= (hi - lo + 1) * c
        else:
            right = left + 1
    return best


def maximum_coins(coins: list[list[int]], k: int) -> int:
    forward = sorted((lo, hi, c) for lo, hi, c in coins)
    backward = sorted((-hi, -lo, c) for lo, hi, c in coins)
    return max(_anchored_at_starts(forward, k), _anchored_at_starts(backward, k))
