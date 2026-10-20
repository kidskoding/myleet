from itertools import zip_longest


def compare_version(version1: str, version2: str) -> int:
    a = [int(x) for x in version1.split(".")]
    b = [int(x) for x in version2.split(".")]
    for x, y in zip_longest(a, b, fillvalue=0):
        if x != y:
            return -1 if x < y else 1
    return 0
