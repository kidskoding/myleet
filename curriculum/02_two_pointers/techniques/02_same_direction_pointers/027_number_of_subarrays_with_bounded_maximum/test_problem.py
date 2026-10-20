from solution import num_subarray_bounded_max


def test_num_subarray_bounded_max_normal():
    assert num_subarray_bounded_max([2, 1, 4, 3], 2, 3) == 3


def test_num_subarray_bounded_max_wider_range():
    assert num_subarray_bounded_max([2, 9, 2, 5, 6], 2, 8) == 7
