def nearest_valid_point(x: int, y: int, points: list[list[int]]) -> int:
    best, answer = float("inf"), -1
    for i, (px, py) in enumerate(points):
        if px == x or py == y:
            distance = abs(px - x) + abs(py - y)
            if distance < best:
                best, answer = distance, i
    return answer
