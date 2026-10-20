from solution import longest_palindrome


def test_longest_palindrome_mixed_counts():
    assert longest_palindrome("abccccdd") == 7


def test_longest_palindrome_single_letter():
    assert longest_palindrome("a") == 1


def test_longest_palindrome_case_sensitive():
    assert longest_palindrome("Aa") == 1


def test_longest_palindrome_all_even():
    assert longest_palindrome("aabb") == 4


def test_longest_palindrome_odd_run():
    assert longest_palindrome("ccc") == 3


def test_longest_palindrome_several_odd_counts():
    assert longest_palindrome("aaabbbcc") == 7
