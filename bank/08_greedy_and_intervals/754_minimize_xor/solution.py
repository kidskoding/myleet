def minimize_xor(num1: int, num2: int) -> int:
    remaining = bin(num2).count("1")
    x = 0
    for bit in range(31, -1, -1):
        if remaining and num1 >> bit & 1:
            x |= 1 << bit
            remaining -= 1
    bit = 0
    while remaining:
        if not x >> bit & 1:
            x |= 1 << bit
            remaining -= 1
        bit += 1
    return x
