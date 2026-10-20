def min_operations(nums1: list[int], nums2: list[int]) -> int:
    if len(nums1) > 6 * len(nums2) or len(nums2) > 6 * len(nums1):
        return -1
    sum1, sum2 = sum(nums1), sum(nums2)
    if sum1 > sum2:
        nums1, nums2 = nums2, nums1
        sum1, sum2 = sum2, sum1
    gap = sum2 - sum1
    gains = [0] * 6
    for x in nums1:
        gains[6 - x] += 1
    for x in nums2:
        gains[x - 1] += 1
    ops = 0
    for gain in range(5, 0, -1):
        if gap <= 0:
            break
        use = min(gains[gain], -(-gap // gain))
        ops += use
        gap -= use * gain
    return ops
