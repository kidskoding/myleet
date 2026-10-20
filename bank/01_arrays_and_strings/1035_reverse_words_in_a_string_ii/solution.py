def _reverse(s: list[str], lo: int, hi: int) -> None:
    while lo < hi:
        s[lo], s[hi] = s[hi], s[lo]
        lo += 1
        hi -= 1


def reverse_words(s: list[str]) -> None:
    n = len(s)
    _reverse(s, 0, n - 1)
    start = 0
    for i in range(n + 1):
        if i == n or s[i] == " ":
            _reverse(s, start, i - 1)
            start = i + 1
