def unmarked_sum_array(nums: list[int], queries: list[list[int]]) -> list[int]:
    order = sorted(range(len(nums)), key=lambda i: (nums[i], i))
    marked = [False] * len(nums)
    remaining = sum(nums)
    pointer = 0
    result = []
    for index, k in queries:
        if not marked[index]:
            marked[index] = True
            remaining -= nums[index]
        while k > 0 and pointer < len(order):
            i = order[pointer]
            pointer += 1
            if not marked[i]:
                marked[i] = True
                remaining -= nums[i]
                k -= 1
        result.append(remaining)
    return result
