from solution import count_pairs


def test_count_pairs_example_k_two():
    assert count_pairs([1, 2, 3, 4, 5], 2) == 7


def test_count_pairs_no_pairs():
    assert count_pairs([1, 2, 3, 4], 5) == 0


def test_count_pairs_single_element():
    assert count_pairs([5], 5) == 0


def test_count_pairs_k_one_counts_every_pair():
    assert count_pairs([1, 1, 1, 1], 1) == 6


def test_count_pairs_factors_split_across_pair():
    assert count_pairs([3, 5, 6, 10], 30) == 3
