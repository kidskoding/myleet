def circular_permutation(n: int, start: int) -> list[int]:
    return [start ^ i ^ (i >> 1) for i in range(1 << n)]
