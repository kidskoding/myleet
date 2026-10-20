def count_of_pairs(n: int, x: int, y: int) -> list[int]:
    x, y = min(x, y), max(x, y)
    if y - x <= 1:
        return [2 * (n - k) for k in range(1, n + 1)]

    diff = [0] * (n + 2)

    def add(lo: int, hi: int, amount: int) -> None:
        if lo <= hi:
            diff[lo] += amount
            diff[hi + 1] -= amount

    cycle = y - x + 1
    left, right = x - 1, n - y
    half = cycle // 2

    def cycle_ways(c: int) -> int:
        if c == 0:
            return 1
        return 1 if 2 * c == cycle else 2

    for tail in (left, right):
        for d in range(1, tail):
            add(d, d, tail - d)
        for c in range(half + 1):
            add(1 + c, tail + c, cycle_ways(c))
    for d in range(1, half + 1):
        add(d, d, cycle if 2 * d < cycle else cycle // 2)
    for p in range(1, left + 1):
        add(p + 2, p + 1 + right, 1)

    result = []
    running = 0
    for k in range(1, n + 1):
        running += diff[k]
        result.append(2 * running)
    return result
