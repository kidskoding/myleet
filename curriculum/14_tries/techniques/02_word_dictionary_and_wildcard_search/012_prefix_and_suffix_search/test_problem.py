from solution import WordFilter


def test_word_filter_matches_prefix_and_suffix():
    word_filter = WordFilter(["apple"])

    assert word_filter.f("a", "e") == 0


def test_word_filter_no_match():
    word_filter = WordFilter(["apple"])

    assert word_filter.f("b", "e") == -1


def test_word_filter_returns_largest_index():
    word_filter = WordFilter(["apple", "apply"])

    assert word_filter.f("app", "y") == 1
