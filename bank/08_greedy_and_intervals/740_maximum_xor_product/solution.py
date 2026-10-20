def maximum_xor_product(a: int, b: int, n: int) -> int:
    for i in range(n - 1, -1, -1):
        bit = 1 << i
        if (a & bit) == (b & bit):
            a |= bit
            b |= bit
        elif a > b:
            a &= ~bit
            b |= bit
        else:
            a |= bit
            b &= ~bit
    return a * b % (10**9 + 7)
