def min_operations(nums1: list[int], nums2: list[int], k: int) -> int:
    if k == 0:
        return 0 if nums1 == nums2 else -1
    balance = 0
    moves = 0
    for a, b in zip(nums1, nums2):
        diff = a - b
        if diff % k:
            return -1
        balance += diff
        if diff > 0:
            moves += diff // k
    return moves if balance == 0 else -1
