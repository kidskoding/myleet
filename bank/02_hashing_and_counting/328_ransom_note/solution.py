from collections import Counter


def can_construct(ransom_note: str, magazine: str) -> bool:
    available = Counter(magazine)
    for ch in ransom_note:
        available[ch] -= 1
        if available[ch] < 0:
            return False
    return True
