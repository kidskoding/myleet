def last_stone_weight_ii(stones: list[int]) -> int:
    total = sum(stones)
    half = total // 2
    reachable = [True] + [False] * half
    for stone in stones:
        for s in range(half, stone - 1, -1):
            if reachable[s - stone]:
                reachable[s] = True
    best = max(s for s in range(half + 1) if reachable[s])
    return total - 2 * best
