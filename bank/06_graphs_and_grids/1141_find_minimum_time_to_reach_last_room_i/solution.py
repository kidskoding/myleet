import heapq


def min_time_to_reach(move_time: list[list[int]]) -> int:
    rows, cols = len(move_time), len(move_time[0])
    best = [[float("inf")] * cols for _ in range(rows)]
    best[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        t, r, c = heapq.heappop(heap)
        if (r, c) == (rows - 1, cols - 1):
            return t
        if t > best[r][c]:
            continue
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols:
                arrive = max(t, move_time[nr][nc]) + 1
                if arrive < best[nr][nc]:
                    best[nr][nc] = arrive
                    heapq.heappush(heap, (arrive, nr, nc))
    return -1
