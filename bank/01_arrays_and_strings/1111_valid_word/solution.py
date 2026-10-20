VOWELS = set("aeiouAEIOU")


def is_valid(word: str) -> bool:
    if len(word) < 3:
        return False
    has_vowel = has_consonant = False
    for ch in word:
        if not ch.isascii() or not ch.isalnum():
            return False
        if ch.isalpha():
            if ch in VOWELS:
                has_vowel = True
            else:
                has_consonant = True
    return has_vowel and has_consonant
