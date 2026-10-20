def min_array_length(nums: list[int], k: int) -> int:
    if 0 in nums:
        return 1
    length = 1
    current = nums[0]
    for value in nums[1:]:
        if current * value <= k:
            current *= value
        else:
            current = value
            length += 1
    return length
