from collections import Counter


def equal_pairs(grid: list[list[int]]) -> int:
    rows = Counter(tuple(row) for row in grid)
    return sum(rows[col] for col in zip(*grid))
