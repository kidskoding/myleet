from typing import Protocol


class Master(Protocol):
    def guess(self, word: str) -> int: ...


def find_secret_word(words: list[str], master: Master) -> None:
    # Problem 217: Guess the Word

    # Time:
    # Space:

    raise NotImplementedError
