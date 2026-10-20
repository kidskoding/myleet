from solution import largest_merge


def test_largest_merge_example_one():
    assert largest_merge("cabaa", "bcaaa") == "cbcabaaaaa"


def test_largest_merge_example_two():
    assert largest_merge("abcabc", "abdcaba") == "abdcabcabcaba"


def test_largest_merge_single_chars():
    assert largest_merge("a", "b") == "ba"


def test_largest_merge_identical():
    assert largest_merge("ab", "ab") == "abab"


def test_largest_merge_tie_needs_lookahead():
    assert largest_merge("aab", "aac") == "aacaab"


def test_largest_merge_prefix_tie():
    assert largest_merge("ba", "b") == "bba"
