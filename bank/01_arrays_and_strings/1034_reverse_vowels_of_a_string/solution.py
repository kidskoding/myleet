VOWELS = set("aeiouAEIOU")


def reverse_vowels(s: str) -> str:
    chars = list(s)
    i, j = 0, len(chars) - 1
    while i < j:
        if chars[i] not in VOWELS:
            i += 1
        elif chars[j] not in VOWELS:
            j -= 1
        else:
            chars[i], chars[j] = chars[j], chars[i]
            i += 1
            j -= 1
    return "".join(chars)
