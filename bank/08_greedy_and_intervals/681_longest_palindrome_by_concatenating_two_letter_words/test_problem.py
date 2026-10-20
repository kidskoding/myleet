from solution import longest_palindrome


def test_longest_palindrome_example_one():
    assert longest_palindrome(["lc", "cl", "gg"]) == 6


def test_longest_palindrome_example_two():
    assert longest_palindrome(["ab", "ty", "yt", "lc", "cl", "ab"]) == 8


def test_longest_palindrome_only_one_double_in_center():
    assert longest_palindrome(["cc", "ll", "xx"]) == 2


def test_longest_palindrome_no_match():
    assert longest_palindrome(["ab"]) == 0


def test_longest_palindrome_repeated_doubles():
    assert longest_palindrome(["gg", "gg", "gg"]) == 6


def test_longest_palindrome_unbalanced_reverse_pairs():
    assert longest_palindrome(["ab", "ba", "ab", "ba", "ab"]) == 8
