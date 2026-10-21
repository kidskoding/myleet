def kth_smallest_product(nums1: list[int], nums2: list[int], k: int) -> int:
    def count(x: int) -> int:
        total = 0
        for a in nums1:
            if a > 0:
                lo, hi = 0, len(nums2)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if a * nums2[mid] <= x:
                        lo = mid + 1
                    else:
                        hi = mid
                total += lo
            elif a < 0:
                lo, hi = 0, len(nums2)
                while lo < hi:
                    mid = (lo + hi) // 2
                    if a * nums2[mid] <= x:
                        hi = mid
                    else:
                        lo = mid + 1
                total += len(nums2) - lo
            else:
                if x >= 0:
                    total += len(nums2)
        return total

    left, right = -(10**10), 10**10
    while left < right:
        mid = (left + right) // 2
        if count(mid) >= k:
            right = mid
        else:
            left = mid + 1
    return left
