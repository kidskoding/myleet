from collections import defaultdict
from functools import cache
from itertools import product


def pyramid_transition(bottom: str, allowed: list[str]) -> bool:
    tops: dict[str, list[str]] = defaultdict(list)
    for pattern in allowed:
        tops[pattern[:2]].append(pattern[2])

    @cache
    def can_finish(row: str) -> bool:
        if len(row) == 1:
            return True
        choices = [tops.get(row[i : i + 2], []) for i in range(len(row) - 1)]
        return any(can_finish("".join(nxt)) for nxt in product(*choices))

    return can_finish(bottom)
