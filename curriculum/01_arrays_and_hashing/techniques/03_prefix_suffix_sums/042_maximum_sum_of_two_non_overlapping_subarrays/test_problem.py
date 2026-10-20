from solution import max_sum_two_no_overlap


def test_max_sum_two_no_overlap_normal():
    assert max_sum_two_no_overlap([0, 6, 5, 2, 2, 5, 1, 9, 4], 1, 2) == 20


def test_max_sum_two_no_overlap_longer_windows():
    assert max_sum_two_no_overlap([3, 8, 1, 3, 2, 1, 8, 9, 0], 3, 2) == 29


def test_max_sum_two_no_overlap_wide_windows():
    assert max_sum_two_no_overlap([2, 1, 5, 6, 0, 9, 5, 0, 3, 8], 4, 3) == 31
