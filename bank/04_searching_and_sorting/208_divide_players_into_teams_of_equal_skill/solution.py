def divide_players(skill: list[int]) -> int:
    ordered = sorted(skill)
    n = len(ordered)
    target = ordered[0] + ordered[-1]
    chemistry = 0
    for i in range(n // 2):
        low, high = ordered[i], ordered[n - 1 - i]
        if low + high != target:
            return -1
        chemistry += low * high
    return chemistry
