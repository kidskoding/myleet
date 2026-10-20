from solution import compress


def check(chars: list[str], expected: list[str]) -> None:
    n = compress(chars)
    assert n == len(expected)
    assert chars[:n] == expected


def test_compress_example():
    check(["a", "a", "b", "b", "c", "c", "c"], ["a", "2", "b", "2", "c", "3"])


def test_compress_single():
    check(["a"], ["a"])


def test_compress_multi_digit_count():
    check(["a"] + ["b"] * 12, ["a", "b", "1", "2"])


def test_compress_ten_of_one():
    check(["z"] * 10, ["z", "1", "0"])


def test_compress_no_runs():
    check(["a", "b", "c"], ["a", "b", "c"])


def test_compress_repeated_char_later():
    check(["a", "a", "b", "a", "a"], ["a", "2", "b", "a", "2"])
