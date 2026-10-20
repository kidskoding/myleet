def distribute_candies(n: int, limit: int) -> int:
    ways = 0
    for first in range(min(n, limit) + 1):
        rest = n - first
        low = max(0, rest - limit)
        high = min(rest, limit)
        if low <= high:
            ways += high - low + 1
    return ways
