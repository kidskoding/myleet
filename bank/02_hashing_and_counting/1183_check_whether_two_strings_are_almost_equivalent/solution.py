from collections import Counter


def check_almost_equivalent(word1: str, word2: str) -> bool:
    cnt = Counter(word1)
    for ch in word2:
        cnt[ch] -= 1
    return all(abs(v) <= 3 for v in cnt.values())
