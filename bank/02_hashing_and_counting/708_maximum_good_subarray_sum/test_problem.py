from solution import maximum_subarray_sum


def test_maximum_subarray_sum_adjacent_pair():
    assert maximum_subarray_sum([1, 2, 3, 4, 5, 6], 1) == 11


def test_maximum_subarray_sum_with_negative_start():
    assert maximum_subarray_sum([-1, 3, 2, 4, 5], 3) == 11


def test_maximum_subarray_sum_all_negative():
    assert maximum_subarray_sum([-1, -2, -3, -4], 2) == -6


def test_maximum_subarray_sum_no_good_subarray():
    assert maximum_subarray_sum([1, 5, 9], 2) == 0


def test_maximum_subarray_sum_decreasing_pair():
    assert maximum_subarray_sum([10, 0, 7], 3) == 17


def test_maximum_subarray_sum_prefers_cheaper_start():
    assert maximum_subarray_sum([2, -10, 2, 4], 2) == 6
