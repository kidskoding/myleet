from solution import median_sliding_window


def test_median_sliding_window_odd_window():
    nums = [1, 3, -1, -3, 5, 3, 6, 7]
    assert median_sliding_window(nums, 3) == [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]


def test_median_sliding_window_with_repeats():
    nums = [1, 2, 3, 4, 2, 3, 1, 4, 2]
    assert median_sliding_window(nums, 3) == [2, 3, 3, 3, 2, 3, 2]
