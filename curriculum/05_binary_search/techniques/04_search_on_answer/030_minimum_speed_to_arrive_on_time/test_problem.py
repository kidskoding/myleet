from solution import min_speed_on_time


def test_min_speed_on_time_generous_hour():
    assert min_speed_on_time([1, 3, 2], 6) == 1


def test_min_speed_on_time_fractional_hour():
    assert min_speed_on_time([1, 3, 2], 2.7) == 3


def test_min_speed_on_time_impossible():
    assert min_speed_on_time([1, 3, 2], 1.9) == -1
