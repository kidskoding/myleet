from solution import max_absolute_sum


def test_max_absolute_sum_negative_run_wins():
    assert max_absolute_sum([1, -3, 2, 3, -4]) == 5


def test_max_absolute_sum_longer():
    assert max_absolute_sum([2, -5, 1, -4, 3, -2]) == 8


def test_max_absolute_sum_all_positive():
    assert max_absolute_sum([1, 2, 3]) == 6
