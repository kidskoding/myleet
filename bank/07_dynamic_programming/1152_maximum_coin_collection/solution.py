def max_coins(lane1: list[int], lane2: list[int]) -> int:
    neg_inf = float("-inf")
    zero = one = two = neg_inf
    best = neg_inf
    for a, b in zip(lane1, lane2):
        zero, one, two = (
            a + max(0, zero),
            b + max(0, zero, one),
            a + max(one, two),
        )
        best = max(best, zero, one, two)
    return int(best)
