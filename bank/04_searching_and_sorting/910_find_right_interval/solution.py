from bisect import bisect_left


def find_right_interval(intervals: list[list[int]]) -> list[int]:
    starts = sorted((start, i) for i, (start, _) in enumerate(intervals))
    keys = [start for start, _ in starts]
    result = []
    for _, end in intervals:
        pos = bisect_left(keys, end)
        result.append(starts[pos][1] if pos < len(starts) else -1)
    return result
