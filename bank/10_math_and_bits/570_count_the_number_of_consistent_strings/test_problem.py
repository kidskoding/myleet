from solution import count_consistent_strings


def test_count_consistent_strings_example_one():
    assert count_consistent_strings("ab", ["ad", "bd", "aaab", "baa", "badab"]) == 2


def test_count_consistent_strings_all_consistent():
    assert count_consistent_strings("abc", ["a", "b", "c", "ab", "ac", "bc", "abc"]) == 7


def test_count_consistent_strings_example_three():
    assert count_consistent_strings("cad", ["cc", "acd", "b", "ba", "bac", "bad", "ac", "d"]) == 4


def test_count_consistent_strings_none_consistent():
    assert count_consistent_strings("a", ["z", "az"]) == 0
