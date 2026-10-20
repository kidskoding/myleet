from collections import defaultdict


def odd_string(words: list[str]) -> str:
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for word in words:
        key = tuple(ord(b) - ord(a) for a, b in zip(word, word[1:]))
        groups[key].append(word)
    for members in groups.values():
        if len(members) == 1:
            return members[0]
    raise ValueError("no odd string")
