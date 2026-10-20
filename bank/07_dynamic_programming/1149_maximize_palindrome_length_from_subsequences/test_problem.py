from solution import longest_palindrome


def test_longest_palindrome_across_both_words():
    assert longest_palindrome("cacb", "cbba") == 5


def test_longest_palindrome_odd_length():
    assert longest_palindrome("ab", "ab") == 3


def test_longest_palindrome_none_possible():
    assert longest_palindrome("aa", "bb") == 0


def test_longest_palindrome_single_chars():
    assert longest_palindrome("a", "a") == 2


def test_longest_palindrome_palindrome_inside_one_word_does_not_count():
    assert longest_palindrome("aaaa", "b") == 0


def test_longest_palindrome_interleaved_letters():
    assert longest_palindrome("bab", "aba") == 5
