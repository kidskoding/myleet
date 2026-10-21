from solution import distinct_echo_substrings


def test_distinct_echo_substrings_normal():
    assert distinct_echo_substrings("abcabcabc") == 3


def test_distinct_echo_substrings_leetcode():
    assert distinct_echo_substrings("leetcodeleetcode") == 2


def test_distinct_echo_substrings_none():
    assert distinct_echo_substrings("abc") == 0


def test_distinct_echo_substrings_aa():
    assert distinct_echo_substrings("aa") == 1
