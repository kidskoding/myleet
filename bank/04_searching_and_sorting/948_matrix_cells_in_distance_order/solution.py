def all_cells_dist_order(rows: int, cols: int, r_center: int, c_center: int) -> list[list[int]]:
    buckets: list[list[list[int]]] = [[] for _ in range(rows + cols - 1)]
    for r in range(rows):
        for c in range(cols):
            buckets[abs(r - r_center) + abs(c - c_center)].append([r, c])
    return [cell for bucket in buckets for cell in bucket]
