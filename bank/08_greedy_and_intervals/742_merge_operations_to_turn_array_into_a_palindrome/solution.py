def minimum_operations(nums: list[int]) -> int:
    i, j = 0, len(nums) - 1
    left, right = nums[i], nums[j]
    ops = 0
    while i < j:
        if left == right:
            i += 1
            j -= 1
            left, right = nums[i], nums[j]
        elif left < right:
            i += 1
            left += nums[i]
            ops += 1
        else:
            j -= 1
            right += nums[j]
            ops += 1
    return ops
