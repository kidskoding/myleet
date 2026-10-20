import heapq


def halve_array(nums: list[int]) -> int:
    heap = [-float(x) for x in nums]
    heapq.heapify(heap)
    target = sum(nums) / 2
    reduced = 0.0
    ops = 0
    while reduced < target:
        half = -heapq.heappop(heap) / 2
        reduced += half
        heapq.heappush(heap, -half)
        ops += 1
    return ops
