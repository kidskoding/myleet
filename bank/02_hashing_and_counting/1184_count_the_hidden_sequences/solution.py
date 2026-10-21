def number_of_arrays(differences: list[int], lower: int, upper: int) -> int:
    prefix = cur = 0
    min_p = max_p = 0
    for d in differences:
        cur += d
        min_p = min(min_p, cur)
        max_p = max(max_p, cur)
    return max(0, (upper - max_p) - (lower - min_p) + 1)
