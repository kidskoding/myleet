from functools import cache


def assign_bikes(workers: list[list[int]], bikes: list[list[int]]) -> int:
    def dist(w: int, b: int) -> int:
        return abs(workers[w][0] - bikes[b][0]) + abs(workers[w][1] - bikes[b][1])

    @cache
    def best(w: int, used: int) -> int:
        if w == len(workers):
            return 0
        return min(dist(w, b) + best(w + 1, used | (1 << b)) for b in range(len(bikes)) if not used & (1 << b))

    return best(0, 0)
