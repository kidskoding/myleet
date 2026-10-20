def two_out_of_three(nums1: list[int], nums2: list[int], nums3: list[int]) -> list[int]:
    a, b, c = set(nums1), set(nums2), set(nums3)
    return list((a & b) | (a & c) | (b & c))
