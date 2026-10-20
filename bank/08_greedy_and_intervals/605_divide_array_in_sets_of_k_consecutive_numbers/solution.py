from collections import Counter


def is_possible_divide(nums: list[int], k: int) -> bool:
    if len(nums) % k:
        return False
    count = Counter(nums)
    for start in sorted(count):
        need = count[start]
        if need == 0:
            continue
        for v in range(start, start + k):
            if count[v] < need:
                return False
            count[v] -= need
    return True
