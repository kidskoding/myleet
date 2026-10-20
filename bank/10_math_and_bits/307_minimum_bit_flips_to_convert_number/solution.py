def min_bit_flips(start: int, goal: int) -> int:
    diff = start ^ goal
    count = 0
    while diff:
        diff &= diff - 1
        count += 1
    return count
