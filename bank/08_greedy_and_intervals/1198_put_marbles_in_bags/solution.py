def put_marbles(weights: list[int], k: int) -> int:
    if k == 1:
        return 0
    pairs = sorted(weights[i] + weights[i + 1] for i in range(len(weights) - 1))
    splits = k - 1
    return sum(pairs[-splits:]) - sum(pairs[:splits])
