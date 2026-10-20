from collections import defaultdict


def max_equal_freq(nums: list[int]) -> int:
    count: dict[int, int] = defaultdict(int)
    freq: dict[int, int] = defaultdict(int)
    max_f = 0
    best = 0
    for i, x in enumerate(nums, 1):
        if count[x]:
            freq[count[x]] -= 1
        count[x] += 1
        freq[count[x]] += 1
        max_f = max(max_f, count[x])
        if max_f == 1 or max_f * freq[max_f] == i - 1 or (max_f - 1) * (freq[max_f - 1] + 1) == i - 1:
            best = i
    return best
