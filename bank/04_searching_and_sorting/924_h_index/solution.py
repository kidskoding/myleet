def h_index(citations: list[int]) -> int:
    n = len(citations)
    buckets = [0] * (n + 1)
    for c in citations:
        buckets[min(c, n)] += 1
    at_least = 0
    for h in range(n, -1, -1):
        at_least += buckets[h]
        if at_least >= h:
            return h
    return 0
