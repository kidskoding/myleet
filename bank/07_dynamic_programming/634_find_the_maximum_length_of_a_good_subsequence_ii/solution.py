from collections import defaultdict


def maximum_length(nums: list[int], k: int) -> int:
    ending: defaultdict[int, list[int]] = defaultdict(lambda: [0] * (k + 1))
    overall = [0] * (k + 1)
    for x in nums:
        row = ending[x]
        for j in range(k, -1, -1):
            row[j] = max(row[j], overall[j - 1] if j else 0) + 1
            overall[j] = max(overall[j], row[j])
    return overall[k]
