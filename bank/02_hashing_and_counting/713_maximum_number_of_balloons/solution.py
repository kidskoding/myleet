from collections import Counter


def max_number_of_balloons(text: str) -> int:
    counts = Counter(text)
    need = Counter("balloon")
    return min(counts[ch] // times for ch, times in need.items())
