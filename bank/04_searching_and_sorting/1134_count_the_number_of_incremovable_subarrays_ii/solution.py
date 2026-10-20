def incremovable_subarray_count(nums: list[int]) -> int:
    n = len(nums)
    i = 0
    while i + 1 < n and nums[i] < nums[i + 1]:
        i += 1
    if i == n - 1:
        return n * (n + 1) // 2

    j = n - 1
    while j > 0 and nums[j - 1] < nums[j]:
        j -= 1

    total = n - j + 1
    for p in range(i + 1):
        while j < n and nums[j] <= nums[p]:
            j += 1
        total += n - j + 1
    return total
