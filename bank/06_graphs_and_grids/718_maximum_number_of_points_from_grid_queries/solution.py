import heapq


def max_points(grid: list[list[int]], queries: list[int]) -> list[int]:
    rows, cols = len(grid), len(grid[0])
    answer = [0] * len(queries)
    heap = [(grid[0][0], 0, 0)]
    seen = {(0, 0)}
    reached = 0
    for qi in sorted(range(len(queries)), key=lambda i: queries[i]):
        limit = queries[qi]
        while heap and heap[0][0] < limit:
            _, r, c = heapq.heappop(heap)
            reached += 1
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    heapq.heappush(heap, (grid[nr][nc], nr, nc))
        answer[qi] = reached
    return answer
