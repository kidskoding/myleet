def assign_bikes(workers: list[list[int]], bikes: list[list[int]]) -> list[int]:
    pairs = sorted((abs(wx - bx) + abs(wy - by), w, b) for w, (wx, wy) in enumerate(workers) for b, (bx, by) in enumerate(bikes))
    result = [-1] * len(workers)
    taken = [False] * len(bikes)
    assigned = 0
    for _, w, b in pairs:
        if result[w] == -1 and not taken[b]:
            result[w] = b
            taken[b] = True
            assigned += 1
            if assigned == len(workers):
                break
    return result
