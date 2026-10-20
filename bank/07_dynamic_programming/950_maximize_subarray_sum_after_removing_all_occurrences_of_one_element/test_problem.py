from solution import max_subarray_sum


def test_max_subarray_sum_remove_repeated_negative():
    assert max_subarray_sum([-3, 2, -2, -1, 3, -2, 3]) == 7


def test_max_subarray_sum_all_positive():
    assert max_subarray_sum([1, 2, 3, 4]) == 10


def test_max_subarray_sum_all_negative():
    assert max_subarray_sum([-5, -2, -8]) == -2


def test_max_subarray_sum_single_element():
    assert max_subarray_sum([-7]) == -7


def test_max_subarray_sum_all_same_negative_cannot_be_removed():
    assert max_subarray_sum([-1, -1, -1]) == -1


def test_max_subarray_sum_remove_single_barrier():
    assert max_subarray_sum([5, -10, 5]) == 10


def test_max_subarray_sum_with_zeros():
    assert max_subarray_sum([0, -3, 0, 4, -3, 2]) == 6
