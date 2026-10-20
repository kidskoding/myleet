import random

from solution import find_secret_word


class FakeMaster:
    def __init__(self, words: list[str], secret: str, allowed: int) -> None:
        self.words = set(words)
        self.secret = secret
        self.allowed = allowed
        self.calls = 0
        self.found = False

    def guess(self, word: str) -> int:
        self.calls += 1
        if word not in self.words:
            return -1
        if word == self.secret:
            self.found = True
        return sum(a == b for a, b in zip(word, self.secret))


def solved(words: list[str], secret: str, allowed: int = 10) -> bool:
    master = FakeMaster(words, secret, allowed)
    find_secret_word(words, master)
    return master.found and master.calls <= allowed


def test_find_secret_word_small_list():
    assert solved(["acckzz", "ccbazz", "eiowzz", "abcczz"], "acckzz")


def test_find_secret_word_two_words():
    words = ["hamada", "khaled"]
    assert solved(words, "hamada")
    assert solved(words, "khaled")


def test_find_secret_word_single_word():
    assert solved(["abcdef"], "abcdef", allowed=1)


def test_find_secret_word_every_secret_in_dense_list():
    rng = random.Random(2024)
    words: set[str] = set()
    while len(words) < 100:
        words.add("".join(rng.choice("abcd") for _ in range(6)))
    ordered = sorted(words)
    assert all(solved(ordered, secret) for secret in ordered)
