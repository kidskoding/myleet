from collections import deque


def min_flips(mat: list[list[int]]) -> int:
    m, n = len(mat), len(mat[0])
    start = 0
    for r in range(m):
        for c in range(n):
            if mat[r][c]:
                start |= 1 << (r * n + c)
    masks = []
    for r in range(m):
        for c in range(n):
            mask = 0
            for dr, dc in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    mask |= 1 << (nr * n + nc)
            masks.append(mask)
    dist = {start: 0}
    queue = deque([start])
    while queue:
        state = queue.popleft()
        if state == 0:
            return dist[state]
        for mask in masks:
            nxt = state ^ mask
            if nxt not in dist:
                dist[nxt] = dist[state] + 1
                queue.append(nxt)
    return -1
