def min_taps(n: int, ranges: list[int]) -> int:
    reach = [0] * (n + 1)
    for i, r in enumerate(ranges):
        left = max(0, i - r)
        reach[left] = max(reach[left], min(n, i + r))
    taps = covered = farthest = 0
    for i in range(n):
        farthest = max(farthest, reach[i])
        if i == covered:
            if farthest <= i:
                return -1
            taps += 1
            covered = farthest
    return taps
