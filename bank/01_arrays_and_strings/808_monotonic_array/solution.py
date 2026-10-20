def is_monotonic(nums: list[int]) -> bool:
    up = down = False
    for a, b in zip(nums, nums[1:]):
        if a < b:
            up = True
        elif a > b:
            down = True
    return not (up and down)
