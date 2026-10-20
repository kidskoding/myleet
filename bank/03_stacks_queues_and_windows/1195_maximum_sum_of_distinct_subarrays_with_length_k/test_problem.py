from solution import maximum_subarray_sum


def test_maximum_subarray_sum_example_one():
    assert maximum_subarray_sum([1, 5, 4, 2, 9, 9, 9], 3) == 15


def test_maximum_subarray_sum_no_valid_window():
    assert maximum_subarray_sum([4, 4, 4], 3) == 0


def test_maximum_subarray_sum_window_size_one():
    assert maximum_subarray_sum([3, 8, 2, 8], 1) == 8


def test_maximum_subarray_sum_whole_array():
    assert maximum_subarray_sum([1, 2, 3, 4], 4) == 10


def test_maximum_subarray_sum_duplicate_far_apart():
    assert maximum_subarray_sum([5, 1, 2, 5, 3], 3) == 10


def test_maximum_subarray_sum_duplicate_leaves_window():
    assert maximum_subarray_sum([9, 9, 1, 2, 9], 3) == 12
