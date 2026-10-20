from solution import longest_prefix


def test_longest_prefix_normal():
    assert longest_prefix("level") == "l"


def test_longest_prefix_full_repeat():
    assert longest_prefix("ababab") == "abab"


def test_longest_prefix_none():
    assert longest_prefix("leetcode") == ""
