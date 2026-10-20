from solution import longest_common_prefix


def test_longest_common_prefix_example_one():
    assert longest_common_prefix([1, 10, 100], [1000]) == 3


def test_longest_common_prefix_none_shared():
    assert longest_common_prefix([1, 2, 3], [4, 4, 4]) == 0


def test_longest_common_prefix_differs_in_last_digit():
    assert longest_common_prefix([12345], [12346]) == 4


def test_longest_common_prefix_identical_single_digit():
    assert longest_common_prefix([1], [1]) == 1


def test_longest_common_prefix_best_pair_among_many():
    assert longest_common_prefix([5655359, 77], [56554, 778]) == 4
