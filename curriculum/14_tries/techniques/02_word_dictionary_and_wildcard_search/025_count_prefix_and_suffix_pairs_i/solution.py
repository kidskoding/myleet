from __future__ import annotations


def count_prefix_suffix_pairs(words: list[str]) -> int:
    # Problem 25: Count Prefix and Suffix Pairs I
    # Time: O(n^2 * L) for small n
    # Space: O(1)

    def is_prefix_and_suffix(a: str, b: str) -> bool:
        return b.startswith(a) and b.endswith(a)

    n = len(words)
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            if is_prefix_and_suffix(words[i], words[j]):
                count += 1
    return count
