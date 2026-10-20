def can_cross(stones: list[int]) -> bool:
    jumps: dict[int, set[int]] = {s: set() for s in stones}
    jumps[stones[0]].add(0)
    for stone in stones:
        for k in jumps[stone]:
            for step in (k - 1, k, k + 1):
                if step > 0 and stone + step in jumps:
                    jumps[stone + step].add(step)
    return bool(jumps[stones[-1]])
