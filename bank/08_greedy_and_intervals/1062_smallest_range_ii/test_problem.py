from solution import smallest_range_ii


def test_smallest_range_ii_single():
    assert smallest_range_ii([1], 0) == 0


def test_smallest_range_ii_two_elements():
    assert smallest_range_ii([0, 10], 2) == 6


def test_smallest_range_ii_three_elements():
    assert smallest_range_ii([1, 3, 6], 3) == 3


def test_smallest_range_ii_large_k_keeps_original():
    assert smallest_range_ii([7, 8, 8], 5) == 1


def test_smallest_range_ii_unsorted_input():
    assert smallest_range_ii([4, 1, 8, 10], 3) == 3


def test_smallest_range_ii_all_equal():
    assert smallest_range_ii([2, 2, 2], 4) == 0
