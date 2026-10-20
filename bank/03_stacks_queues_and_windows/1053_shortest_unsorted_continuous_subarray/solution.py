def find_unsorted_subarray(nums: list[int]) -> int:
    n = len(nums)
    end, start = -1, 0
    hi = nums[0]
    for i in range(n):
        if nums[i] < hi:
            end = i
        else:
            hi = nums[i]
    lo = nums[-1]
    for i in range(n - 1, -1, -1):
        if nums[i] > lo:
            start = i
        else:
            lo = nums[i]
    return end - start + 1 if end != -1 else 0
