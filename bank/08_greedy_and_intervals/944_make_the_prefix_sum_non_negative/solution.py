import heapq


def make_pref_sum_non_negative(nums: list[int]) -> int:
    heap: list[int] = []
    prefix = 0
    moves = 0
    for x in nums:
        prefix += x
        if x < 0:
            heapq.heappush(heap, x)
        if prefix < 0:
            prefix -= heapq.heappop(heap)
            moves += 1
    return moves
