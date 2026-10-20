def count_lattice_points(circles: list[list[int]]) -> int:
    points: set[tuple[int, int]] = set()
    for cx, cy, r in circles:
        for x in range(cx - r, cx + r + 1):
            for y in range(cy - r, cy + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    points.add((x, y))
    return len(points)
