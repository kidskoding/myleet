from solution import get_largest_outlier


def test_get_largest_outlier_simple():
    assert get_largest_outlier([2, 3, 5, 10]) == 10


def test_get_largest_outlier_negative_sum():
    assert get_largest_outlier([-2, -1, -3, -6, 4]) == 4


def test_get_largest_outlier_outlier_equals_sum_value():
    assert get_largest_outlier([1, 1, 1, 1, 1, 5, 5]) == 5


def test_get_largest_outlier_negative_outlier():
    assert get_largest_outlier([6, -31, 50, -35, 41, 37, -42, 13]) == -35


def test_get_largest_outlier_all_zero():
    assert get_largest_outlier([0, 0, 0]) == 0


def test_get_largest_outlier_three_equal_values():
    assert get_largest_outlier([3, 3, 3]) == 3
