def max_repeating(sequence: str, word: str) -> int:
    k = 0
    while word * (k + 1) in sequence:
        k += 1
    return k
