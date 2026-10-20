from solution import find_kth_positive


def test_find_kth_positive_normal():
    assert find_kth_positive([2, 3, 4, 7, 11], 5) == 9


def test_find_kth_positive_beyond_array():
    assert find_kth_positive([1, 2, 3, 4], 2) == 6
