def number_of_ways(s: str, t: str, k: int) -> int:
    mod = 10**9 + 7
    n = len(s)

    fail = [0] * n
    for i in range(1, n):
        j = fail[i - 1]
        while j and t[i] != t[j]:
            j = fail[j - 1]
        if t[i] == t[j]:
            j += 1
        fail[i] = j
    text = s + s[:-1]
    good_zero = 0
    good_other = 0
    j = 0
    for i, ch in enumerate(text):
        while j and ch != t[j]:
            j = fail[j - 1]
        if ch == t[j]:
            j += 1
        if j == n:
            if i - n + 1 == 0:
                good_zero += 1
            else:
                good_other += 1
            j = fail[j - 1]

    inv_n = pow(n, mod - 2, mod)
    total = pow(n - 1, k, mod)
    sign = 1 if k % 2 == 0 else mod - 1
    to_zero = (total + (n - 1) * sign) * inv_n % mod
    to_other = (total - sign) * inv_n % mod
    return (good_zero * to_zero + good_other * to_other) % mod
