def max_distance(words: list[str]) -> int:
    n = len(words)
    best = 0
    for i, word in enumerate(words):
        if word != words[-1]:
            best = max(best, n - i)
        if word != words[0]:
            best = max(best, i + 1)
    return best
