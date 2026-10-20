from solution import largest_palindrome


def test_largest_palindrome_two_digits():
    assert largest_palindrome(2) == 987


def test_largest_palindrome_one_digit():
    assert largest_palindrome(1) == 9


def test_largest_palindrome_three_digits():
    assert largest_palindrome(3) == 123


def test_largest_palindrome_four_digits():
    assert largest_palindrome(4) == 597


def test_largest_palindrome_five_digits():
    assert largest_palindrome(5) == 677


def test_largest_palindrome_eight_digits():
    assert largest_palindrome(8) == 475
