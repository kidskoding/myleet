import re
from collections import Counter


def most_common_word(paragraph: str, banned: list[str]) -> str:
    blocked = set(banned)
    words = [w for w in re.findall(r"[a-z]+", paragraph.lower()) if w not in blocked]
    return Counter(words).most_common(1)[0][0]
