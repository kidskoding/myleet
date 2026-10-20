VOWELS = set("aeiou")


def vowel_strings(words: list[str], queries: list[list[int]]) -> list[int]:
    prefix = [0]
    for word in words:
        prefix.append(prefix[-1] + (word[0] in VOWELS and word[-1] in VOWELS))
    return [prefix[r + 1] - prefix[left] for left, r in queries]
