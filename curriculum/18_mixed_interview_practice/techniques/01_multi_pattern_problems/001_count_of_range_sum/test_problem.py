from solution import count_range_sum


def test_count_range_sum_normal():
    assert count_range_sum([-2, 5, -1], -2, 2) == 3


def test_count_range_sum_single_zero():
    assert count_range_sum([0], 0, 0) == 1
