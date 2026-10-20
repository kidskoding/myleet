def result_array(nums: list[int]) -> list[int]:
    first = [nums[0]]
    second = [nums[1]]
    for x in nums[2:]:
        if first[-1] > second[-1]:
            first.append(x)
        else:
            second.append(x)
    return first + second
