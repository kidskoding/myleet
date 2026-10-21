def min_operations(nums: list[int]) -> int:
    flips = 0
    for bit in nums:
        effective = bit if flips % 2 == 0 else 1 - bit
        if effective == 0:
            flips += 1
    return flips
