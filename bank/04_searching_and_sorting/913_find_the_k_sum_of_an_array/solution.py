import heapq


def k_sum(nums: list[int], k: int) -> int:
    best = sum(x for x in nums if x > 0)
    costs = sorted(abs(x) for x in nums)
    heap = [(costs[0], 0)]
    removed = 0
    for _ in range(k - 1):
        removed, i = heapq.heappop(heap)
        if i + 1 < len(costs):
            heapq.heappush(heap, (removed + costs[i + 1], i + 1))
            heapq.heappush(heap, (removed - costs[i] + costs[i + 1], i + 1))
    return best - removed
