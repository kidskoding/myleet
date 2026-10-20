from solution import max_performance


def test_max_performance_two_engineers():
    assert max_performance(6, [2, 10, 3, 1, 5, 8], [5, 4, 3, 9, 7, 2], 2) == 60


def test_max_performance_three_engineers():
    assert max_performance(6, [2, 10, 3, 1, 5, 8], [5, 4, 3, 9, 7, 2], 3) == 68
