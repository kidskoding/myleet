from collections import Counter


def get_hint(secret: str, guess: str) -> str:
    bulls = sum(s == g for s, g in zip(secret, guess))
    left = Counter(s for s, g in zip(secret, guess) if s != g)
    right = Counter(g for s, g in zip(secret, guess) if s != g)
    cows = sum(min(count, right[d]) for d, count in left.items())
    return f"{bulls}A{cows}B"
