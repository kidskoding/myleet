def max_dist_to_closest(seats: list[int]) -> int:
    occupied = [i for i, seat in enumerate(seats) if seat == 1]
    best = max(occupied[0], len(seats) - 1 - occupied[-1])
    for left, right in zip(occupied, occupied[1:]):
        best = max(best, (right - left) // 2)
    return best
