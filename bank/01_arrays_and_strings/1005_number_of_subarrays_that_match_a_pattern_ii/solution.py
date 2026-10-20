def count_matching_subarrays(nums: list[int], pattern: list[int]) -> int:
    diffs = [(b > a) - (b < a) for a, b in zip(nums, nums[1:])]
    m = len(pattern)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k and pattern[i] != pattern[k]:
            k = fail[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        fail[i] = k
    count = 0
    k = 0
    for value in diffs:
        while k and value != pattern[k]:
            k = fail[k - 1]
        if value == pattern[k]:
            k += 1
        if k == m:
            count += 1
            k = fail[k - 1]
    return count
