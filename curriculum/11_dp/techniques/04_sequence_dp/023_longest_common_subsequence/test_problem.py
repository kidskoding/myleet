from solution import longest_common_subsequence


def test_longest_common_subsequence_no_match():
    assert longest_common_subsequence("abc", "def") == 0


def test_longest_common_subsequence_normal():
    assert longest_common_subsequence("abcde", "ace") == 3


def test_longest_common_subsequence_empty():
    assert longest_common_subsequence("", "abc") == 0
