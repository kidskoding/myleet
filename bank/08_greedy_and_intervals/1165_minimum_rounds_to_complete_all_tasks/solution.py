from collections import Counter


def minimum_rounds(tasks: list[int]) -> int:
    rounds = 0
    for c in Counter(tasks).values():
        if c == 1:
            return -1
        rounds += (c + 2) // 3
    return rounds
