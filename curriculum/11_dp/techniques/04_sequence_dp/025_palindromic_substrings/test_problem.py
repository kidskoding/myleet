from solution import count_substrings


def test_count_substrings_normal():
    assert count_substrings("abc") == 3


def test_count_substrings_all_same():
    assert count_substrings("aaa") == 6


def test_count_substrings_empty():
    assert count_substrings("") == 0
