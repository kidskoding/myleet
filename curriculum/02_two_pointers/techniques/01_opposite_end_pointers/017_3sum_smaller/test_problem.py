from solution import three_sum_smaller


def test_three_sum_smaller_normal():
    assert three_sum_smaller([-2, 0, 1, 3], 2) == 2


def test_three_sum_smaller_empty():
    assert three_sum_smaller([], 0) == 0


def test_three_sum_smaller_too_short():
    assert three_sum_smaller([0], 0) == 0
