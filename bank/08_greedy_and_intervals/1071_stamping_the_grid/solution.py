def possible_to_stamp(grid: list[list[int]], stamp_height: int, stamp_width: int) -> bool:
    m, n = len(grid), len(grid[0])
    occ = [[0] * (n + 1) for _ in range(m + 1)]
    for r in range(m):
        for c in range(n):
            occ[r + 1][c + 1] = grid[r][c] + occ[r][c + 1] + occ[r + 1][c] - occ[r][c]
    diff = [[0] * (n + 2) for _ in range(m + 2)]
    for r in range(m - stamp_height + 1):
        for c in range(n - stamp_width + 1):
            r2, c2 = r + stamp_height, c + stamp_width
            if occ[r2][c2] - occ[r][c2] - occ[r2][c] + occ[r][c] == 0:
                diff[r][c] += 1
                diff[r][c2] -= 1
                diff[r2][c] -= 1
                diff[r2][c2] += 1
    cover = [[0] * (n + 1) for _ in range(m + 1)]
    for r in range(m):
        for c in range(n):
            cover[r + 1][c + 1] = diff[r][c] + cover[r][c + 1] + cover[r + 1][c] - cover[r][c]
            if grid[r][c] == 0 and cover[r + 1][c + 1] == 0:
                return False
    return True
