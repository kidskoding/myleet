from solution import count_subranges


def test_count_subranges_example_one():
    assert count_subranges([1, 2, 5], [2, 6, 3]) == 3


def test_count_subranges_zeros_count_both_ways():
    assert count_subranges([0, 1], [1, 0]) == 4


def test_count_subranges_single_zero_pair():
    assert count_subranges([0], [0]) == 2


def test_count_subranges_single_nonzero():
    assert count_subranges([3], [3]) == 0


def test_count_subranges_equal_neighbors():
    assert count_subranges([1, 1], [1, 1]) == 2


def test_count_subranges_all_zero():
    assert count_subranges([0, 0, 0], [0, 0, 0]) == 22
