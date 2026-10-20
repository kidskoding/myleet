def min_sum(nums1: list[int], nums2: list[int]) -> int:
    z1, z2 = nums1.count(0), nums2.count(0)
    s1, s2 = sum(nums1) + z1, sum(nums2) + z2
    if (s1 < s2 and z1 == 0) or (s2 < s1 and z2 == 0):
        return -1
    return max(s1, s2)
