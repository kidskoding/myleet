from collections import Counter


def is_possible_to_split(nums: list[int]) -> bool:
    return max(Counter(nums).values()) <= 2
