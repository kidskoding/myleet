from collections import Counter


def max_freq(s: str, max_letters: int, min_size: int, max_size: int) -> int:
    seen: Counter[str] = Counter()
    letters: Counter[str] = Counter()
    for i, ch in enumerate(s):
        letters[ch] += 1
        if i >= min_size:
            old = s[i - min_size]
            letters[old] -= 1
            if letters[old] == 0:
                del letters[old]
        if i >= min_size - 1 and len(letters) <= max_letters:
            seen[s[i - min_size + 1 : i + 1]] += 1
    return max(seen.values(), default=0)
