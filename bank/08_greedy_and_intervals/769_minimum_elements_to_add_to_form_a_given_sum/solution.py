def min_elements(nums: list[int], limit: int, goal: int) -> int:
    gap = abs(goal - sum(nums))
    return (gap + limit - 1) // limit
