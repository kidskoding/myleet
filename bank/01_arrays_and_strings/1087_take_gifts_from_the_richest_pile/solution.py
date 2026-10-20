import heapq
from math import isqrt


def pick_gifts(gifts: list[int], k: int) -> int:
    heap = [-g for g in gifts]
    heapq.heapify(heap)
    for _ in range(k):
        largest = -heapq.heappop(heap)
        heapq.heappush(heap, -isqrt(largest))
    return -sum(heap)
