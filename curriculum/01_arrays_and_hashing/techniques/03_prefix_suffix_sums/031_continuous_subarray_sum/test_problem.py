from solution import check_subarray_sum


def test_check_subarray_sum_true():
    assert check_subarray_sum([23, 2, 4, 6, 7], 6) is True


def test_check_subarray_sum_false():
    assert check_subarray_sum([23, 2, 6, 4, 7], 13) is False


def test_check_subarray_sum_zero_sum_pair():
    assert check_subarray_sum([23, 2, 6, 4, 7], 6) is True
