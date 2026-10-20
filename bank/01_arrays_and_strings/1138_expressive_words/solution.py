from itertools import groupby


def expressive_words(s: str, words: list[str]) -> int:
    def groups(text: str) -> list[tuple[str, int]]:
        return [(ch, len(list(run))) for ch, run in groupby(text)]

    target = groups(s)

    def stretchy(word: str) -> bool:
        parts = groups(word)
        if len(parts) != len(target):
            return False
        for (c1, n1), (c2, n2) in zip(target, parts):
            if c1 != c2 or n1 < n2 or (n1 != n2 and n1 < 3):
                return False
        return True

    return sum(stretchy(word) for word in words)
