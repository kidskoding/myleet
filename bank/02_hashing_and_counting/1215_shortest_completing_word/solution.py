from collections import Counter


def shortest_completing_word(license_plate: str, words: list[str]) -> str:
    need = Counter(c.lower() for c in license_plate if c.isalpha())
    best = ""
    for word in words:
        have = Counter(word)
        if all(have[c] >= n for c, n in need.items()) and (not best or len(word) < len(best)):
            best = word
    return best
