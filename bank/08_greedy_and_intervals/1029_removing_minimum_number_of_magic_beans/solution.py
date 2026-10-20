def minimum_removal(beans: list[int]) -> int:
    beans = sorted(beans)
    n = len(beans)
    keep = max(value * (n - i) for i, value in enumerate(beans))
    return sum(beans) - keep
