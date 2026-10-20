def minimum_one_bit_operations(n: int) -> int:
    result = 0
    while n:
        result ^= n
        n >>= 1
    return result
