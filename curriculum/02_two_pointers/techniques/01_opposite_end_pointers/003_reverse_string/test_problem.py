from solution import reverse_string


def test_reverse_string_empty():
    s: list[str] = []
    reverse_string(s)
    assert s == []


def test_reverse_string_single():
    s = ["a"]
    reverse_string(s)
    assert s == ["a"]


def test_reverse_string_multiple():
    s = ["h", "e", "l", "l", "o"]
    reverse_string(s)
    assert s == ["o", "l", "l", "e", "h"]
