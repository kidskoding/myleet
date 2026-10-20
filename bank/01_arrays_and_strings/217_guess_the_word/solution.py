from collections import Counter
from typing import Protocol


class Master(Protocol):
    def guess(self, word: str) -> int: ...


def _matches(a: str, b: str) -> int:
    return sum(x == y for x, y in zip(a, b))


def find_secret_word(words: list[str], master: Master) -> None:
    candidates = list(words)
    while candidates:
        guess = min(candidates, key=lambda w: max(Counter(_matches(w, other) for other in candidates).values()))
        hits = master.guess(guess)
        if hits == len(guess):
            return
        candidates = [w for w in candidates if _matches(guess, w) == hits]
