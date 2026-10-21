from collections import Counter


def similar_pairs(words: list[str]) -> int:
    cnt: Counter[int] = Counter()
    ans = 0
    for word in words:
        mask = 0
        for ch in word:
            mask |= 1 << (ord(ch) - ord("a"))
        ans += cnt[mask]
        cnt[mask] += 1
    return ans
