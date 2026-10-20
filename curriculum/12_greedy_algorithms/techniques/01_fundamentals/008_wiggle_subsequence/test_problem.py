from solution import wiggle_max_length


def test_wiggle_max_length_fully_wiggly():
    assert wiggle_max_length([1, 7, 4, 9, 2, 5]) == 6


def test_wiggle_max_length_monotonic():
    assert wiggle_max_length([1, 2, 3, 4, 5, 6, 7, 8, 9]) == 2
