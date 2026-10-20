import heapq


def eaten_apples(apples: list[int], days: list[int]) -> int:
    heap: list[list[int]] = []
    eaten = 0
    day = 0
    n = len(apples)
    while day < n or heap:
        if day < n and apples[day] > 0:
            heapq.heappush(heap, [day + days[day], apples[day]])
        while heap and (heap[0][0] <= day or heap[0][1] == 0):
            heapq.heappop(heap)
        if heap:
            heap[0][1] -= 1
            eaten += 1
        day += 1
    return eaten
