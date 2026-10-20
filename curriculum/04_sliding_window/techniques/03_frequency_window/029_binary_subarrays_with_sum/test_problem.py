from solution import num_subarrays_with_sum


def test_num_subarrays_with_sum_normal():
    assert num_subarrays_with_sum([1, 0, 1, 0, 1], 2) == 4


def test_num_subarrays_with_sum_all_zeros():
    assert num_subarrays_with_sum([0, 0, 0, 0, 0], 0) == 15
