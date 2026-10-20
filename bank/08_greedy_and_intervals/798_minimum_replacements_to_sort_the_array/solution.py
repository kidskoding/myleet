def minimum_replacement(nums: list[int]) -> int:
    ops = 0
    bound = nums[-1]
    for v in reversed(nums[:-1]):
        pieces = (v + bound - 1) // bound
        ops += pieces - 1
        bound = v // pieces
    return ops
