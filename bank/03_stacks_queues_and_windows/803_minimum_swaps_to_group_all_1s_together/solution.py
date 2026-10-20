def min_swaps(data: list[int]) -> int:
    k = sum(data)
    if k <= 1:
        return 0
    window = sum(data[:k])
    best = window
    for i in range(k, len(data)):
        window += data[i] - data[i - k]
        best = max(best, window)
    return k - best
