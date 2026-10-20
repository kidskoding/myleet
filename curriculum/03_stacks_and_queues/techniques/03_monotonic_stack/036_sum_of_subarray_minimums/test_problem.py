from solution import sum_subarray_mins


def test_sum_subarray_mins_normal():
    assert sum_subarray_mins([3, 1, 2, 4]) == 17


def test_sum_subarray_mins_larger():
    assert sum_subarray_mins([11, 81, 94, 43, 3]) == 444
