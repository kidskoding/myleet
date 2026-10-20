def count_points(points: list[list[int]], queries: list[list[int]]) -> list[int]:
    answer = []
    for cx, cy, r in queries:
        r2 = r * r
        answer.append(sum(1 for x, y in points if (x - cx) ** 2 + (y - cy) ** 2 <= r2))
    return answer
