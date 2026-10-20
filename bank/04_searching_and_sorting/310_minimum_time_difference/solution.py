def find_min_difference(time_points: list[str]) -> int:
    minutes = sorted(int(t[:2]) * 60 + int(t[3:]) for t in time_points)
    best = minutes[0] + 24 * 60 - minutes[-1]
    for a, b in zip(minutes, minutes[1:]):
        best = min(best, b - a)
    return best
