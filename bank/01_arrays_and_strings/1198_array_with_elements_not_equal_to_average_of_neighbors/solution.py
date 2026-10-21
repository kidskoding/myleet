def rearrange_array(nums: list[int]) -> list[int]:
    ordered = sorted(nums)
    ans = nums[:]
    mid = (len(ordered) + 1) // 2
    ans[::2] = ordered[:mid]
    ans[1::2] = ordered[mid:]
    return ans
