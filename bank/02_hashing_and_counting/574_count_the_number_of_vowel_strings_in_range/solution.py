VOWELS = set("aeiou")


def vowel_strings(words: list[str], left: int, right: int) -> int:
    return sum(1 for word in words[left : right + 1] if word[0] in VOWELS and word[-1] in VOWELS)
