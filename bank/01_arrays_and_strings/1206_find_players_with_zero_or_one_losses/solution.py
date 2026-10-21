from collections import defaultdict


def find_winners(matches: list[list[int]]) -> list[list[int]]:
    losses: dict[int, int] = defaultdict(int)
    seen: set[int] = set()
    for w, l in matches:
        seen.add(w)
        seen.add(l)
        losses[l] += 1
    zero = sorted(p for p in seen if losses[p] == 0)
    one = sorted(p for p in seen if losses[p] == 1)
    return [zero, one]
