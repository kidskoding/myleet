def create_target_array(nums: list[int], index: list[int]) -> list[int]:
    target: list[int] = []
    for value, at in zip(nums, index):
        target.insert(at, value)
    return target
