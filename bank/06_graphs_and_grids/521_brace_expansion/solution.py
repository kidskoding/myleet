from itertools import product


def expand(s: str) -> list[str]:
    groups: list[list[str]] = []
    i = 0
    while i < len(s):
        if s[i] == "{":
            close = s.index("}", i)
            groups.append(sorted(s[i + 1 : close].split(",")))
            i = close + 1
        else:
            groups.append([s[i]])
            i += 1
    return ["".join(word) for word in product(*groups)]
