from solution import is_substring_present


def test_is_substring_present_double_letter():
    assert is_substring_present("leetcode") is True


def test_is_substring_present_palindrome():
    assert is_substring_present("abcba") is True


def test_is_substring_present_none():
    assert is_substring_present("abcd") is False


def test_is_substring_present_single_character():
    assert is_substring_present("a") is False


def test_is_substring_present_two_equal():
    assert is_substring_present("aa") is True


def test_is_substring_present_two_different():
    assert is_substring_present("ab") is False
