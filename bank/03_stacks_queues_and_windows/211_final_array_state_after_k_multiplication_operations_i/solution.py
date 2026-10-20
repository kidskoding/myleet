import heapq


def get_final_state(nums: list[int], k: int, multiplier: int) -> list[int]:
    result = list(nums)
    heap = [(value, i) for i, value in enumerate(result)]
    heapq.heapify(heap)
    for _ in range(k):
        value, i = heapq.heappop(heap)
        result[i] = value * multiplier
        heapq.heappush(heap, (result[i], i))
    return result
