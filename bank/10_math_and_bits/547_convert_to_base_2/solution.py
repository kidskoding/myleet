def base_neg2(n: int) -> str:
    if n == 0:
        return "0"
    digits: list[str] = []
    while n:
        digits.append(str(n & 1))
        n = -(n >> 1)
    return "".join(reversed(digits))
