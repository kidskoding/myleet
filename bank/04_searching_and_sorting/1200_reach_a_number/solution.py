def reach_number(target: int) -> int:
    target = abs(target)
    k = 0
    total = 0
    while total < target or (total - target) % 2:
        k += 1
        total += k
    return k
