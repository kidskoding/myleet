from solution import count_fair_pairs


def test_count_fair_pairs_example_one():
    assert count_fair_pairs([0, 1, 7, 4, 4, 5], 3, 6) == 6


def test_count_fair_pairs_example_two():
    assert count_fair_pairs([1, 7, 9, 2, 5], 11, 11) == 1


def test_count_fair_pairs_single_element():
    assert count_fair_pairs([5], 0, 10) == 0


def test_count_fair_pairs_negatives():
    assert count_fair_pairs([-1, -2, 3, 0], -3, 1) == 4


def test_count_fair_pairs_all_equal():
    assert count_fair_pairs([2, 2, 2, 2], 4, 4) == 6
