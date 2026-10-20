def max_non_decreasing_length(nums1: list[int], nums2: list[int]) -> int:
    end1 = end2 = 1
    best = 1
    for i in range(1, len(nums1)):
        a, b = nums1[i], nums2[i]
        pa, pb = nums1[i - 1], nums2[i - 1]
        new1 = max(end1 + 1 if pa <= a else 1, end2 + 1 if pb <= a else 1)
        new2 = max(end1 + 1 if pa <= b else 1, end2 + 1 if pb <= b else 1)
        end1, end2 = new1, new2
        best = max(best, end1, end2)
    return best
