import heapq


def find_crossing_time(n: int, k: int, time: list[list[int]]) -> int:
    order = sorted(range(k), key=lambda i: (time[i][0] + time[i][2], i))
    cost = [time[i] for i in order]
    wait_left = [-i for i in range(k)]
    heapq.heapify(wait_left)
    wait_right: list[int] = []
    busy_left: list[tuple[int, int]] = []
    busy_right: list[tuple[int, int]] = []
    now = 0
    while True:
        while busy_left and busy_left[0][0] <= now:
            heapq.heappush(wait_left, -heapq.heappop(busy_left)[1])
        while busy_right and busy_right[0][0] <= now:
            heapq.heappush(wait_right, -heapq.heappop(busy_right)[1])
        if wait_right:
            i = -heapq.heappop(wait_right)
            now += cost[i][2]
            if n == 0 and not wait_right and not busy_right:
                return now
            heapq.heappush(busy_left, (now + cost[i][3], i))
        elif n > 0 and wait_left:
            i = -heapq.heappop(wait_left)
            now += cost[i][0]
            n -= 1
            heapq.heappush(busy_right, (now + cost[i][1], i))
        else:
            pending = [h[0][0] for h in (busy_left, busy_right) if h]
            now = min(pending)
