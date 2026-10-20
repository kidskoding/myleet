from solution import equal_count_substrings


def test_equal_count_substrings_example_three_matches():
    assert equal_count_substrings("aaabcbbcc", 3) == 3


def test_equal_count_substrings_example_none():
    assert equal_count_substrings("abcd", 2) == 0


def test_equal_count_substrings_count_longer_than_string():
    assert equal_count_substrings("a", 5) == 0


def test_equal_count_substrings_count_one():
    assert equal_count_substrings("abab", 1) == 7


def test_equal_count_substrings_pairs():
    assert equal_count_substrings("aabb", 2) == 3
