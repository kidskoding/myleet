from collections import Counter


def max_frequency_elements(nums: list[int]) -> int:
    counts = Counter(nums).values()
    top = max(counts)
    return sum(c for c in counts if c == top)
