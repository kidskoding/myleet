from solution import max_subarray_sum_circular


def test_max_subarray_sum_circular_non_wrapping():
    assert max_subarray_sum_circular([1, -2, 3, -2]) == 3


def test_max_subarray_sum_circular_wraps():
    assert max_subarray_sum_circular([5, -3, 5]) == 10


def test_max_subarray_sum_circular_all_negative():
    assert max_subarray_sum_circular([-3, -2, -3]) == -2


def test_max_subarray_sum_circular_wraps_by_one():
    assert max_subarray_sum_circular([3, -1, 2, -1]) == 4
