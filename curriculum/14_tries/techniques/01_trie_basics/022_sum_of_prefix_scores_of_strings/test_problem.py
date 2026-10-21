from solution import sum_prefix_scores


def test_sum_prefix_scores_normal():
    assert sum_prefix_scores(["abc", "ab", "bc", "b"]) == [5, 4, 3, 2]


def test_sum_prefix_scores_identical_words():
    assert sum_prefix_scores(["abcd"]) == [4]


def test_sum_prefix_scores_shared_prefixes():
    assert sum_prefix_scores(["a", "ab", "abc"]) == [3, 5, 6]


def test_sum_prefix_scores_no_shared():
    assert sum_prefix_scores(["a", "b", "c"]) == [1, 1, 1]
