from collections import Counter


def find_lonely(nums: list[int]) -> list[int]:
    count = Counter(nums)
    return [x for x, c in count.items() if c == 1 and x - 1 not in count and x + 1 not in count]
