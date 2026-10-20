from collections import Counter


def longest_palindrome(s: str) -> int:
    length = 0
    has_odd = False
    for count in Counter(s).values():
        length += count - count % 2
        has_odd = has_odd or count % 2 == 1
    return length + int(has_odd)
