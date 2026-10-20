from collections.abc import Callable


def read(buf: list[str], n: int, read4: Callable[[list[str]], int]) -> int:
    total = 0
    chunk = [""] * 4
    while total < n:
        got = read4(chunk)
        take = min(got, n - total)
        buf[total : total + take] = chunk[:take]
        total += take
        if got < 4:
            break
    return total
