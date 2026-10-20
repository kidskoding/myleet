from collections.abc import Callable

from solution import read


def make_read4(content: str) -> Callable[[list[str]], int]:
    pos = 0

    def read4(buf4: list[str]) -> int:
        nonlocal pos
        chunk = content[pos : pos + 4]
        for i, ch in enumerate(chunk):
            buf4[i] = ch
        pos += len(chunk)
        return len(chunk)

    return read4


def run(content: str, n: int) -> tuple[int, str]:
    buf = [""] * n
    count = read(buf, n, make_read4(content))
    return count, "".join(buf[:count])


def test_read_file_shorter_than_n():
    assert run("abc", 4) == (3, "abc")


def test_read_exact_length():
    assert run("abcde", 5) == (5, "abcde")


def test_read_multiple_full_chunks():
    assert run("abcdABCD1234", 12) == (12, "abcdABCD1234")


def test_read_stops_mid_chunk():
    assert run("leetcode", 5) == (5, "leetc")


def test_read_empty_file():
    assert run("", 3) == (0, "")


def test_read_n_on_chunk_boundary():
    assert run("abcdefgh", 4) == (4, "abcd")
