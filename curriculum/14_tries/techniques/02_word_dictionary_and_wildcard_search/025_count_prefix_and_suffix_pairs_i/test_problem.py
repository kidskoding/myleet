from solution import count_prefix_suffix_pairs


def test_count_prefix_suffix_pairs_normal():
    assert count_prefix_suffix_pairs(["a", "aba", "ababa", "aa"]) == 4


def test_count_prefix_suffix_pairs_none():
    assert count_prefix_suffix_pairs(["pa", "papa", "ma", "mama"]) == 2


def test_count_prefix_suffix_pairs_no_pairs():
    assert count_prefix_suffix_pairs(["abab", "ab"]) == 0


def test_count_prefix_suffix_pairs_identical():
    assert count_prefix_suffix_pairs(["a", "a"]) == 1


def test_count_prefix_suffix_pairs_single():
    assert count_prefix_suffix_pairs(["hello"]) == 0
