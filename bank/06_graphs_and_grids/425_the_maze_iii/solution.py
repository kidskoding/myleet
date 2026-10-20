import heapq


def find_shortest_way(maze: list[list[int]], ball: list[int], hole: list[int]) -> str:
    # Time: O(R * C * log(R * C) * max(R, C)).
    # Space: O(R * C).
    rows, cols = len(maze), len(maze[0])
    hr, hc = hole
    moves = (("d", 1, 0), ("l", 0, -1), ("r", 0, 1), ("u", -1, 0))
    best: dict[tuple[int, int], tuple[int, str]] = {(ball[0], ball[1]): (0, "")}
    heap: list[tuple[int, str, int, int]] = [(0, "", ball[0], ball[1])]
    while heap:
        dist, path, r, c = heapq.heappop(heap)
        if (r, c) == (hr, hc):
            return path
        if best.get((r, c), (dist, path)) < (dist, path):
            continue
        for name, dr, dc in moves:
            nr, nc, steps = r, c, 0
            while 0 <= nr + dr < rows and 0 <= nc + dc < cols and maze[nr + dr][nc + dc] == 0:
                nr += dr
                nc += dc
                steps += 1
                if (nr, nc) == (hr, hc):
                    break
            if steps == 0:
                continue
            cand = (dist + steps, path + name)
            if (nr, nc) not in best or cand < best[(nr, nc)]:
                best[(nr, nc)] = cand
                heapq.heappush(heap, (cand[0], cand[1], nr, nc))
    return "impossible"
