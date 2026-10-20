from collections import Counter


def count_words(words1: list[str], words2: list[str]) -> int:
    first = Counter(words1)
    second = Counter(words2)
    return sum(1 for word, c in first.items() if c == 1 and second[word] == 1)
