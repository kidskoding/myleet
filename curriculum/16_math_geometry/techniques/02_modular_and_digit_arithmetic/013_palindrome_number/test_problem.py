from solution import is_palindrome


def test_is_palindrome_true():
    assert is_palindrome(121) is True


def test_is_palindrome_negative():
    assert is_palindrome(-121) is False


def test_is_palindrome_trailing_zero():
    assert is_palindrome(10) is False
