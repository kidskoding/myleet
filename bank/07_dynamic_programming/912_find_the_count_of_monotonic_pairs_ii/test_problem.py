from solution import count_of_pairs


def test_count_of_pairs_small_example():
    assert count_of_pairs([2, 3, 2]) == 4


def test_count_of_pairs_constant_array():
    assert count_of_pairs([5, 5, 5, 5]) == 126


def test_count_of_pairs_single_element():
    assert count_of_pairs([5]) == 6


def test_count_of_pairs_two_ones():
    assert count_of_pairs([1, 1]) == 3


def test_count_of_pairs_decreasing():
    assert count_of_pairs([3, 1]) == 3


def test_count_of_pairs_steep_rise_has_no_answer():
    assert count_of_pairs([1, 5, 1]) == 0
