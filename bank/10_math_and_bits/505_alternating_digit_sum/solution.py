def alternate_digit_sum(n: int) -> int:
    return sum(int(d) if i % 2 == 0 else -int(d) for i, d in enumerate(str(n)))
