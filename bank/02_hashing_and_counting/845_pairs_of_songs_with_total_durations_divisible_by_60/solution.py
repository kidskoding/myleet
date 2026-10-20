def num_pairs_divisible_by_60(time: list[int]) -> int:
    seen = [0] * 60
    pairs = 0
    for t in time:
        r = t % 60
        pairs += seen[(60 - r) % 60]
        seen[r] += 1
    return pairs
