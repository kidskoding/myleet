from solution import is_palindrome


def test_is_palindrome_empty():
    assert is_palindrome("") is True


def test_is_palindrome_single_char():
    assert is_palindrome("a") is True


def test_is_palindrome_alphanumeric_only():
    assert is_palindrome("A man, a plan, a canal: Panama") is True


def test_is_palindrome_not_palindrome():
    assert is_palindrome("race a car") is False
