from itertools import permutations


def _merge(x: str, y: str) -> str:
    if y in x:
        return x
    if x in y:
        return y
    for size in range(min(len(x), len(y)), 0, -1):
        if x[-size:] == y[:size]:
            return x + y[size:]
    return x + y


def minimum_string(a: str, b: str, c: str) -> str:
    best = ""
    for x, y, z in permutations((a, b, c)):
        cand = _merge(_merge(x, y), z)
        if not best or (len(cand), cand) < (len(best), best):
            best = cand
    return best
