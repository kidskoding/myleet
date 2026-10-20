def count_of_pairs(n: int, x: int, y: int) -> list[int]:
    result = [0] * n
    for i in range(1, n + 1):
        for j in range(i + 1, n + 1):
            d = min(j - i, abs(i - x) + 1 + abs(j - y), abs(i - y) + 1 + abs(j - x))
            result[d - 1] += 2
    return result
