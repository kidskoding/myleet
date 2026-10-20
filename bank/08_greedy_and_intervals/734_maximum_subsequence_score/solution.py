import heapq


def max_score(nums1: list[int], nums2: list[int], k: int) -> int:
    pairs = sorted(zip(nums2, nums1), reverse=True)
    heap: list[int] = []
    total = 0
    best = 0
    for low, value in pairs:
        heapq.heappush(heap, value)
        total += value
        if len(heap) > k:
            total -= heapq.heappop(heap)
        if len(heap) == k:
            best = max(best, total * low)
    return best
