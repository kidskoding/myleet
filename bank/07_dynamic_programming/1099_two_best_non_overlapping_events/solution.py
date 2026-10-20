from bisect import bisect_right


def max_two_events(events: list[list[int]]) -> int:
    events = sorted(events)
    starts = [e[0] for e in events]
    suffix = [0] * (len(events) + 1)
    for i in range(len(events) - 1, -1, -1):
        suffix[i] = max(suffix[i + 1], events[i][2])
    best = 0
    for _, end, value in events:
        j = bisect_right(starts, end)
        best = max(best, value + suffix[j])
    return best
