from math import gcd


def count_different_subsequence_gcds(nums: list[int]) -> int:
    present = set(nums)
    top = max(nums)
    count = 0
    for g in range(1, top + 1):
        current = 0
        for multiple in range(g, top + 1, g):
            if multiple in present:
                current = gcd(current, multiple)
                if current == g:
                    count += 1
                    break
    return count
