from collections.abc import Callable

from solution import Reader


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


def run(content: str, requests: list[int]) -> list[str]:
    reader = Reader(make_read4(content))
    out = []
    for n in requests:
        buf = [""] * n
        count = reader.read(buf, n)
        out.append("".join(buf[:count]))
    return out


def test_reader_small_reads_keep_leftovers():
    assert run("abc", [1, 2, 1]) == ["a", "bc", ""]


def test_reader_read_past_end():
    assert run("abc", [4, 1]) == ["abc", ""]


def test_reader_reads_span_chunks():
    assert run("abcdefgh", [3, 3, 3]) == ["abc", "def", "gh"]


def test_reader_empty_file():
    assert run("", [1, 2]) == ["", ""]


def test_reader_leftover_then_full_chunk():
    assert run("abcde", [1, 4]) == ["a", "bcde"]


def test_reader_large_then_small():
    assert run("abcdefghij", [9, 5]) == ["abcdefghi", "j"]
