from solution import minimum_time


def test_minimum_time_three_seconds():
    assert minimum_time([1, 2, 3], [1, 2, 3], 4) == 3


def test_minimum_time_impossible():
    assert minimum_time([1, 2, 3], [3, 3, 3], 4) == -1


def test_minimum_time_already_small():
    assert minimum_time([1], [1], 5) == 0


def test_minimum_time_single_reset():
    assert minimum_time([5], [0], 0) == 1


def test_minimum_time_needs_every_reset():
    assert minimum_time([4, 4, 1], [1, 0, 3], 4) == 3
