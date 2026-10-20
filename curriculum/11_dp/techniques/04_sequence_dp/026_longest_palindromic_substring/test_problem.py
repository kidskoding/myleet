from solution import longest_palindrome


def test_longest_palindrome_normal():
    assert longest_palindrome("babad") in ("bab", "aba")


def test_longest_palindrome_single_char():
    assert longest_palindrome("a") == "a"


def test_longest_palindrome_all_same():
    assert longest_palindrome("bb") == "bb"
