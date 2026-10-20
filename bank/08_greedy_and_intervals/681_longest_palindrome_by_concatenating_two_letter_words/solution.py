from collections import Counter


def longest_palindrome(words: list[str]) -> int:
    counts = Counter(words)
    length = 0
    has_center = False
    for word, count in counts.items():
        if word[0] == word[1]:
            length += (count // 2) * 4
            if count % 2:
                has_center = True
        elif word < word[::-1]:
            length += min(count, counts.get(word[::-1], 0)) * 4
    return length + (2 if has_center else 0)
