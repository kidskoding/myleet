def triangle_number(nums: list[int]) -> int:
    nums = sorted(nums)
    count = 0
    for k in range(len(nums) - 1, 1, -1):
        lo, hi = 0, k - 1
        while lo < hi:
            if nums[lo] + nums[hi] > nums[k]:
                count += hi - lo
                hi -= 1
            else:
                lo += 1
    return count
