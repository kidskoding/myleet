from itertools import product


def find_integer(k: int, digit1: int, digit2: int) -> int:
    limit = 2**31 - 1
    digits = sorted({str(digit1), str(digit2)})
    for length in range(1, 11):
        for combo in product(digits, repeat=length):
            if combo[0] == "0":
                continue
            value = int("".join(combo))
            if value > limit:
                return -1
            if value > k and value % k == 0:
                return value
    return -1
