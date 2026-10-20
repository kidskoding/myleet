from collections import defaultdict, deque


def min_moves(matrix: list[str]) -> int:
    rows, cols = len(matrix), len(matrix[0])
    portals: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for r, row in enumerate(matrix):
        for c, ch in enumerate(row):
            if ch.isupper():
                portals[ch].append((r, c))

    inf = float("inf")
    dist = [[inf] * cols for _ in range(rows)]
    dist[0][0] = 0
    queue: deque[tuple[int, int, int]] = deque([(0, 0, 0)])
    while queue:
        d, r, c = queue.popleft()
        if d > dist[r][c]:
            continue
        if (r, c) == (rows - 1, cols - 1):
            return d
        ch = matrix[r][c]
        if ch in portals:
            for pr, pc in portals.pop(ch):
                if d < dist[pr][pc]:
                    dist[pr][pc] = d
                    queue.appendleft((d, pr, pc))
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] != "#" and d + 1 < dist[nr][nc]:
                dist[nr][nc] = d + 1
                queue.append((d + 1, nr, nc))
    return -1
