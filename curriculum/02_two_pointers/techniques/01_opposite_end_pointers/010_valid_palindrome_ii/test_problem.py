from solution import valid_palindrome


def test_valid_palindrome_already_palindrome():
    assert valid_palindrome("aba") is True


def test_valid_palindrome_one_deletion():
    assert valid_palindrome("abca") is True


def test_valid_palindrome_needs_two_deletions():
    assert valid_palindrome("abc") is False
