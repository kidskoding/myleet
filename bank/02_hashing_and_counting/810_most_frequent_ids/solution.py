import heapq
from collections import defaultdict


def most_frequent_ids(nums: list[int], freq: list[int]) -> list[int]:
    counts: dict[int, int] = defaultdict(int)
    heap: list[tuple[int, int]] = []
    result = []
    for value, delta in zip(nums, freq):
        counts[value] += delta
        heapq.heappush(heap, (-counts[value], value))
        while heap and -heap[0][0] != counts[heap[0][1]]:
            heapq.heappop(heap)
        result.append(-heap[0][0] if heap else 0)
    return result
