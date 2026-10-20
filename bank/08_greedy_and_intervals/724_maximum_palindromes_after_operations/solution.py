from collections import Counter


def max_palindromes_after_operations(words: list[str]) -> int:
    counts = Counter("".join(words))
    pairs = sum(c // 2 for c in counts.values())
    made = 0
    for length in sorted(len(w) for w in words):
        need = length // 2
        if need > pairs:
            break
        pairs -= need
        made += 1
    return made
