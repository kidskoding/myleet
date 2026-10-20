def maximum_value_sum(nums: list[int], k: int, edges: list[list[int]]) -> int:
    total = 0
    flips = 0
    smallest_change = float("inf")
    for x in nums:
        flipped = x ^ k
        total += max(x, flipped)
        if flipped > x:
            flips += 1
        smallest_change = min(smallest_change, abs(flipped - x))
    if flips % 2:
        total -= smallest_change
    return int(total)
