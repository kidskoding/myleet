def min_cost(nums: list[int], cost: list[int]) -> int:
    pairs = sorted(zip(nums, cost))
    half = (sum(cost) + 1) // 2
    running = 0
    for value, weight in pairs:
        running += weight
        if running >= half:
            target = value
            break
    return sum(abs(value - target) * weight for value, weight in pairs)
