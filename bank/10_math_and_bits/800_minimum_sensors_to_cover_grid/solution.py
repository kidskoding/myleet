def min_sensors(n: int, m: int, k: int) -> int:
    side = 2 * k + 1
    return -(-n // side) * -(-m // side)
