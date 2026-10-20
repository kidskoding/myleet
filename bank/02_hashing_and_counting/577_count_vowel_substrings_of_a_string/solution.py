VOWELS = set("aeiou")


def count_vowel_substrings(word: str) -> int:
    total = 0
    for start in range(len(word)):
        seen: set[str] = set()
        for ch in word[start:]:
            if ch not in VOWELS:
                break
            seen.add(ch)
            if len(seen) == 5:
                total += 1
    return total
