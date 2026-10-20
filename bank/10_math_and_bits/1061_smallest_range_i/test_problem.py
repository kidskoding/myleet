from solution import smallest_range_i


def test_smallest_range_i_single():
    assert smallest_range_i([1], 0) == 0


def test_smallest_range_i_two_elements():
    assert smallest_range_i([0, 10], 2) == 6


def test_smallest_range_i_collapse_to_zero():
    assert smallest_range_i([1, 3, 6], 3) == 0


def test_smallest_range_i_k_zero():
    assert smallest_range_i([1, 10], 0) == 9


def test_smallest_range_i_all_equal():
    assert smallest_range_i([5, 5, 5], 1) == 0
