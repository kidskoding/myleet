from __future__ import annotations

from collections import defaultdict, deque


def num_matching_subseq(s: str, words: list[str]) -> int:
    # Problem 26: Number of Matching Subsequences
    # Time: O(|s| + total characters in words)
    # Space: O(total characters in words)

    waiting: dict[str, deque[str]] = defaultdict(deque)
    for word in words:
        waiting[word[0]].append(word)

    matched = 0
    for ch in s:
        bucket = waiting[ch]
        for _ in range(len(bucket)):
            word = bucket.popleft()
            if len(word) == 1:
                matched += 1
            else:
                rest = word[1:]
                waiting[rest[0]].append(rest)
    return matched
