def min_operations(n: int) -> int:
    ops = 0
    while n:
        if n & 1:
            ops += 1
            if n & 2:
                n += 1
            else:
                n -= 1
        n >>= 1
    return ops
