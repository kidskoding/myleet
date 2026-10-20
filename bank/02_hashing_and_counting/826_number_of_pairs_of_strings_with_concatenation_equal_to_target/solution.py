from collections import Counter


def num_of_pairs(nums: list[str], target: str) -> int:
    counts = Counter(nums)
    total = 0
    for cut in range(1, len(target)):
        head, tail = target[:cut], target[cut:]
        if head == tail:
            total += counts[head] * (counts[head] - 1)
        else:
            total += counts[head] * counts[tail]
    return total
