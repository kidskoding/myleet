from solution import longest_palindrome_subseq


def test_longest_palindrome_subseq_normal():
    assert longest_palindrome_subseq("bbbab") == 4


def test_longest_palindrome_subseq_no_repeat():
    assert longest_palindrome_subseq("cbbd") == 2


def test_longest_palindrome_subseq_single():
    assert longest_palindrome_subseq("a") == 1


def test_longest_palindrome_subseq_full_palindrome():
    assert longest_palindrome_subseq("racecar") == 7
