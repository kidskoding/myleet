from collections import defaultdict


def group_strings(strings: list[str]) -> list[list[str]]:
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for s in strings:
        key = tuple((ord(b) - ord(a)) % 26 for a, b in zip(s, s[1:]))
        groups[key].append(s)
    return list(groups.values())
