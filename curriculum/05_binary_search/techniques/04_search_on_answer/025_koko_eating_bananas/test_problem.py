from solution import min_eating_speed


def test_min_eating_speed_basic():
    assert min_eating_speed([3, 6, 7, 11], 8) == 4


def test_min_eating_speed_exact_pile_count():
    assert min_eating_speed([30, 11, 23, 4, 20], 5) == 30


def test_min_eating_speed_generous_hours():
    assert min_eating_speed([30, 11, 23, 4, 20], 6) == 23


def test_min_eating_speed_single_pile():
    assert min_eating_speed([5], 1) == 5
