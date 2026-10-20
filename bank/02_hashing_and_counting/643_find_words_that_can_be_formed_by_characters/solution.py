from collections import Counter


def count_characters(words: list[str], chars: str) -> int:
    available = Counter(chars)
    total = 0
    for word in words:
        need = Counter(word)
        if all(available[ch] >= cnt for ch, cnt in need.items()):
            total += len(word)
    return total
