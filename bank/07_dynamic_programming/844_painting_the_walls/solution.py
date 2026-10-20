def paint_walls(cost: list[int], time: list[int]) -> int:
    n = len(cost)
    inf = float("inf")
    best = [0] + [inf] * n
    for c, t in zip(cost, time):
        for covered in range(n, 0, -1):
            prev = best[max(0, covered - t - 1)]
            if prev + c < best[covered]:
                best[covered] = prev + c
    return best[n]
