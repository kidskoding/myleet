from solution import StreamChecker


def test_stream_checker_matches_suffix():
    stream_checker = StreamChecker(["cd", "f", "kl"])
    results = [stream_checker.query(letter) for letter in "abcdefghijkl"]
    expected = [
        False,
        False,
        False,
        True,
        False,
        True,
        False,
        False,
        False,
        False,
        False,
        True,
    ]
    assert results == expected


def test_stream_checker_single_letter_word():
    stream_checker = StreamChecker(["a"])
    assert stream_checker.query("a") is True
    assert stream_checker.query("b") is False
    assert stream_checker.query("a") is True
