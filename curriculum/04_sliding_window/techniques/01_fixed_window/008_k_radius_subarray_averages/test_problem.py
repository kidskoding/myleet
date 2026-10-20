from solution import get_averages


def test_get_averages_normal():
    nums = [7, 4, 3, 9, 1, 8, 5, 2, 6]
    assert get_averages(nums, 3) == [-1, -1, -1, 5, 4, 4, -1, -1, -1]


def test_get_averages_radius_zero():
    assert get_averages([100000], 0) == [100000]


def test_get_averages_window_too_wide():
    assert get_averages([8], 100000) == [-1]
