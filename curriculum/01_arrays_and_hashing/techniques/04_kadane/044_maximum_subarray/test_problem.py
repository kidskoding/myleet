from solution import max_subarray


def test_max_subarray_normal():
    assert max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6


def test_max_subarray_all_negative():
    assert max_subarray([-3, -1, -2]) == -1


def test_max_subarray_single_element():
    assert max_subarray([5]) == 5
