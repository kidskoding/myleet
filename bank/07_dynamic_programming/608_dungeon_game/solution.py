def calculate_minimum_hp(dungeon: list[list[int]]) -> int:
    m, n = len(dungeon), len(dungeon[0])
    inf = float("inf")
    need = [[inf] * (n + 1) for _ in range(m + 1)]
    need[m][n - 1] = need[m - 1][n] = 1
    for r in range(m - 1, -1, -1):
        for c in range(n - 1, -1, -1):
            need[r][c] = max(1, min(need[r + 1][c], need[r][c + 1]) - dungeon[r][c])
    return int(need[0][0])
