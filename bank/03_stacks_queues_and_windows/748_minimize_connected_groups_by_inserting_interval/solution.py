from bisect import bisect_right


def min_connected_groups(intervals: list[list[int]], k: int) -> int:
    starts: list[int] = []
    ends: list[int] = []
    for start, end in sorted(intervals):
        if ends and start <= ends[-1]:
            ends[-1] = max(ends[-1], end)
        else:
            starts.append(start)
            ends.append(end)
    swallowed = 0
    for i, end in enumerate(ends):
        last = bisect_right(starts, end + k) - 1
        swallowed = max(swallowed, last - i)
    return len(starts) - swallowed
