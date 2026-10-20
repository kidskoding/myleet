def my_atoi(s: str) -> int:
    # Time: O(n).
    # Space: O(1).
    lo, hi = -(2**31), 2**31 - 1
    i, n = 0, len(s)
    while i < n and s[i] == " ":
        i += 1
    sign = 1
    if i < n and s[i] in "+-":
        if s[i] == "-":
            sign = -1
        i += 1
    value = 0
    while i < n and s[i].isdigit():
        value = value * 10 + int(s[i])
        i += 1
    return max(lo, min(hi, sign * value))
