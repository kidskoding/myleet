def max_number(n: int) -> int:
    return (1 << (n.bit_length() - 1)) - 1
