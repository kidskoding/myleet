def kth_grammar(n: int, k: int) -> int:
    return (k - 1).bit_count() % 2
