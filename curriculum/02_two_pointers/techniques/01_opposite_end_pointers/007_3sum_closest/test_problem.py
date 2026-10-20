from solution import three_sum_closest


def test_three_sum_closest_normal():
    assert three_sum_closest([-1, 2, 1, -4], 1) == 2


def test_three_sum_closest_exact_match():
    assert three_sum_closest([0, 0, 0], 1) == 0
