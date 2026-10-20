from solution import is_valid_palindrome


def test_is_valid_palindrome_two_deletions():
    assert is_valid_palindrome("abcdeca", 2) is True


def test_is_valid_palindrome_one_deletion():
    assert is_valid_palindrome("abbababa", 1) is True


def test_is_valid_palindrome_not_enough():
    assert is_valid_palindrome("abc", 1) is False


def test_is_valid_palindrome_single_character():
    assert is_valid_palindrome("a", 1) is True


def test_is_valid_palindrome_all_distinct_boundary():
    assert is_valid_palindrome("abcdef", 5) is True
    assert is_valid_palindrome("abcdef", 4) is False


def test_is_valid_palindrome_already_palindrome():
    assert is_valid_palindrome("racecar", 1) is True
