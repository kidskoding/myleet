def lexicographically_smallest_array(nums: list[int], limit: int) -> list[int]:
    order = sorted(range(len(nums)), key=lambda i: nums[i])
    result = nums[:]
    start = 0
    for end in range(1, len(order) + 1):
        if end == len(order) or nums[order[end]] - nums[order[end - 1]] > limit:
            group = order[start:end]
            for idx, pos in zip(group, sorted(group)):
                result[pos] = nums[idx]
            start = end
    return result
