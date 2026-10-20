import heapq


def minimum_deviation(nums: list[int]) -> int:
    heap = [-(x * 2 if x % 2 else x) for x in nums]
    heapq.heapify(heap)
    low = -max(heap)
    best = -heap[0] - low
    while -heap[0] % 2 == 0:
        top = -heapq.heappop(heap)
        half = top // 2
        low = min(low, half)
        heapq.heappush(heap, -half)
        best = min(best, -heap[0] - low)
    return best
