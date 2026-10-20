from solution import get_subarray_beauty


def test_get_subarray_beauty_normal():
    assert get_subarray_beauty([1, -1, -3, -2, 3], 3, 2) == [-1, -2, -2]


def test_get_subarray_beauty_first_smallest():
    assert get_subarray_beauty([-3, 1, 2, -3, 0, -3], 2, 1) == [-3, 0, -3, -3, -3]


def test_get_subarray_beauty_all_negative():
    assert get_subarray_beauty([-1, -2, -3, -4, -5], 2, 2) == [-1, -2, -3, -4]
