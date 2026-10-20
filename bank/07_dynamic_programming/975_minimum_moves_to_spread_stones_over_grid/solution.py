from itertools import permutations


def minimum_moves(grid: list[list[int]]) -> int:
    extra = []
    empty = []
    for i in range(3):
        for j in range(3):
            if grid[i][j] == 0:
                empty.append((i, j))
            for _ in range(grid[i][j] - 1):
                extra.append((i, j))
    best = float("inf")
    for order in permutations(extra):
        cost = sum(abs(a - c) + abs(b - d) for (a, b), (c, d) in zip(order, empty))
        best = min(best, cost)
    return best
