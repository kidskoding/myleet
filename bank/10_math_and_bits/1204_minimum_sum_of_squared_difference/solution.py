def min_sum_square_diff(nums1: list[int], nums2: list[int], k1: int, k2: int) -> int:
    k = k1 + k2
    cnt = [0] * 100_001
    total = 0
    mx = 0
    for a, b in zip(nums1, nums2):
        v = abs(a - b)
        cnt[v] += 1
        total += v
        mx = max(mx, v)
    if total <= k:
        return 0
    for v in range(mx, 0, -1):
        if cnt[v] == 0:
            continue
        take = min(cnt[v], k)
        k -= take
        cnt[v] -= take
        cnt[v - 1] += take
        if k == 0:
            break
    return sum(v * v * cnt[v] for v in range(mx + 1))
