from solution import number_of_substrings


def test_number_of_substrings_normal():
    assert number_of_substrings("abcabc") == 10


def test_number_of_substrings_skewed():
    assert number_of_substrings("aaacb") == 3


def test_number_of_substrings_minimum():
    assert number_of_substrings("abc") == 1
