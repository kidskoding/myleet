from solution import num_of_subarrays


def test_num_of_subarrays_normal():
    assert num_of_subarrays([2, 2, 2, 2, 5, 5, 5, 8], 3, 4) == 3


def test_num_of_subarrays_mostly_qualifying():
    assert num_of_subarrays([11, 13, 17, 23, 29, 31, 7, 5, 2, 3], 3, 5) == 6


def test_num_of_subarrays_none_qualify():
    assert num_of_subarrays([1, 1, 1, 1], 2, 5) == 0
