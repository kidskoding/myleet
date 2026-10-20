from solution import median_sliding_window


def test_median_sliding_window_normal():
    result = median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)
    assert result == [1, -1, -1, 3, 5, 6]


def test_median_sliding_window_size_one():
    assert median_sliding_window([1, 2, 3], 1) == [1, 2, 3]


def test_median_sliding_window_even_window():
    result = median_sliding_window([1, 2, 3, 4], 2)
    assert result == [1.5, 2.5, 3.5]
