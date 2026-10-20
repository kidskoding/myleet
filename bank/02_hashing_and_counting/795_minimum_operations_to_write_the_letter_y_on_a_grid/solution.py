def minimum_operations_to_write_y(grid: list[list[int]]) -> int:
    n = len(grid)
    mid = n // 2
    inside = [0, 0, 0]
    outside = [0, 0, 0]
    for r in range(n):
        for c in range(n):
            on_y = (r <= mid and (c == r or c == n - 1 - r)) or (r >= mid and c == mid)
            if on_y:
                inside[grid[r][c]] += 1
            else:
                outside[grid[r][c]] += 1
    y_total, other_total = sum(inside), sum(outside)
    return min(y_total - inside[a] + other_total - outside[b] for a in range(3) for b in range(3) if a != b)
