def max_sum_of_three_subarrays(nums: list[int], k: int) -> list[int]:
    n = len(nums)
    windows = []
    s = sum(nums[:k])
    windows.append(s)
    for i in range(k, n):
        s += nums[i] - nums[i - k]
        windows.append(s)
    m = len(windows)
    left = [0] * m
    for i in range(1, m):
        left[i] = i if windows[i] > windows[left[i - 1]] else left[i - 1]
    right = [m - 1] * m
    for i in range(m - 2, -1, -1):
        right[i] = i if windows[i] >= windows[right[i + 1]] else right[i + 1]
    best: list[int] = []
    best_sum = -1
    for mid in range(k, m - k):
        a, c = left[mid - k], right[mid + k]
        total = windows[a] + windows[mid] + windows[c]
        if total > best_sum:
            best_sum = total
            best = [a, mid, c]
    return best
