from solution import NumArray


def test_num_array_sum_range_normal():
    num_array = NumArray([-2, 0, 3, -5, 2, -1])
    assert num_array.sum_range(0, 2) == 1
    assert num_array.sum_range(2, 5) == -1
    assert num_array.sum_range(0, 5) == -3


def test_num_array_sum_range_single_element():
    num_array = NumArray([7])
    assert num_array.sum_range(0, 0) == 7
