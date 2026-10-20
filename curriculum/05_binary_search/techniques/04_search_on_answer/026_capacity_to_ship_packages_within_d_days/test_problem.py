from solution import ship_within_days


def test_ship_within_days_basic():
    assert ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5) == 15


def test_ship_within_days_one_day():
    assert ship_within_days([3, 2, 2, 4, 1, 4], 1) == 16


def test_ship_within_days_one_per_day():
    assert ship_within_days([1, 2, 3, 1, 1], 4) == 3


def test_ship_within_days_single_package():
    assert ship_within_days([7], 1) == 7
