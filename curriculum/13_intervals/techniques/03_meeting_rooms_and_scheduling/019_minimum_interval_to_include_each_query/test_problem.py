from solution import min_interval


def test_min_interval_normal():
    assert min_interval([[1, 4], [2, 4], [3, 6], [4, 4]], [2, 3, 4, 5]) == [3, 3, 1, 4]


def test_min_interval_with_gap():
    intervals = [[2, 3], [2, 5], [1, 8], [20, 25]]
    assert min_interval(intervals, [2, 19, 5, 22]) == [2, -1, 4, 6]
