def shortest_to_char(s: str, c: str) -> list[int]:
    n = len(s)
    out = [n] * n
    last = -n
    for i, ch in enumerate(s):
        if ch == c:
            last = i
        out[i] = i - last
    last = 2 * n
    for i in range(n - 1, -1, -1):
        if s[i] == c:
            last = i
        out[i] = min(out[i], last - i)
    return out
