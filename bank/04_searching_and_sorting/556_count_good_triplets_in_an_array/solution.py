def good_triplets(nums1: list[int], nums2: list[int]) -> int:
    n = len(nums1)
    pos2 = [0] * n
    for i, v in enumerate(nums2):
        pos2[v] = i
    tree = [0] * (n + 1)
    total = 0
    for i, v in enumerate(nums1):
        p = pos2[v]
        smaller_before = 0
        j = p
        while j > 0:
            smaller_before += tree[j]
            j -= j & -j
        larger_after = (n - 1 - p) - (i - smaller_before)
        total += smaller_before * larger_after
        j = p + 1
        while j <= n:
            tree[j] += 1
            j += j & -j
    return total
