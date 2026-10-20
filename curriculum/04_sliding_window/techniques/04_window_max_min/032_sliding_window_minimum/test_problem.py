from solution import min_sliding_window


def test_min_sliding_window_single_element():
    assert min_sliding_window([5], 1) == [5]


def test_min_sliding_window_normal():
    assert min_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3) == [-1, -3, -3, -3, 3, 3]


def test_min_sliding_window_decreasing():
    assert min_sliding_window([4, 3, 2, 1], 2) == [3, 2, 1]
