import heapq


def smallest_chair(times: list[list[int]], target_friend: int) -> int:
    friends = [(a, l, i) for i, (a, l) in enumerate(times)]
    friends.sort()
    free: list[int] = []
    busy: list[tuple[int, int]] = []
    next_chair = 0
    for a, l, i in friends:
        while busy and busy[0][0] <= a:
            heapq.heappush(free, heapq.heappop(busy)[1])
        if free:
            chair = heapq.heappop(free)
        else:
            chair = next_chair
            next_chair += 1
        if i == target_friend:
            return chair
        heapq.heappush(busy, (l, chair))
    return -1
