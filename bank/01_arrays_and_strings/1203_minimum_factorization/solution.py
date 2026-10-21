def smallest_factorization(num: int) -> int:
    if num < 10:
        return num
    digits: list[int] = []
    for d in range(9, 1, -1):
        while num % d == 0:
            digits.append(d)
            num //= d
    if num != 1:
        return 0
    ans = 0
    for d in reversed(digits):
        ans = ans * 10 + d
        if ans > 2**31 - 1:
            return 0
    return ans
