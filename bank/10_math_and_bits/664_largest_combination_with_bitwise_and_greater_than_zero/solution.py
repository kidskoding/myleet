def largest_combination(candidates: list[int]) -> int:
    return max(sum(1 for x in candidates if x >> bit & 1) for bit in range(24))
