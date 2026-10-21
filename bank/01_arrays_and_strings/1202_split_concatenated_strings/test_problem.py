from solution import split_looped_string


def test_split_looped_string_example_one():
    assert split_looped_string(["abc", "xyz"]) == "zyxcba"


def test_split_looped_string_example_two():
    assert split_looped_string(["abc"]) == "cba"


def test_split_looped_string_single_chars():
    assert split_looped_string(["a", "b", "c"]) == "cab"


def test_split_looped_string_palindrome_parts():
    assert split_looped_string(["aaa", "bbb"]) == "bbbaaa"
