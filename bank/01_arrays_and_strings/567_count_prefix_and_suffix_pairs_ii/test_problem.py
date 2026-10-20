from solution import count_prefix_suffix_pairs


def test_count_prefix_suffix_pairs_example_one():
    assert count_prefix_suffix_pairs(["a", "aba", "ababa", "aa"]) == 4


def test_count_prefix_suffix_pairs_example_two():
    assert count_prefix_suffix_pairs(["pa", "papa", "ma", "mama"]) == 2


def test_count_prefix_suffix_pairs_order_matters():
    assert count_prefix_suffix_pairs(["abab", "ab"]) == 0


def test_count_prefix_suffix_pairs_duplicates():
    assert count_prefix_suffix_pairs(["abc", "abc", "abc"]) == 3


def test_count_prefix_suffix_pairs_prefix_only():
    assert count_prefix_suffix_pairs(["ab", "abb"]) == 0


def test_count_prefix_suffix_pairs_long_overlap():
    assert count_prefix_suffix_pairs(["a" * 1000, "a" * 2000, "b"]) == 1
