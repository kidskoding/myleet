def _strict(values: list[int]) -> bool:
    return all(a < b for a, b in zip(values, values[1:]))


def can_be_increasing(nums: list[int]) -> bool:
    for i in range(1, len(nums)):
        if nums[i] <= nums[i - 1]:
            return _strict(nums[: i - 1] + nums[i:]) or _strict(nums[:i] + nums[i + 1 :])
    return True
