from solution import break_palindrome


def test_break_palindrome_example():
    assert break_palindrome("abccba") == "aaccba"


def test_break_palindrome_single_char():
    assert break_palindrome("a") == ""


def test_break_palindrome_all_a_even():
    assert break_palindrome("aa") == "ab"


def test_break_palindrome_middle_is_skipped():
    assert break_palindrome("aba") == "abb"


def test_break_palindrome_all_a_odd():
    assert break_palindrome("aaa") == "aab"


def test_break_palindrome_first_char():
    assert break_palindrome("zz") == "az"
