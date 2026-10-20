from solution import minimum_time


def test_minimum_time_reachable():
    assert minimum_time([[0, 1, 3, 2], [5, 1, 2, 5], [4, 3, 8, 6]]) == 7


def test_minimum_time_stuck_at_start():
    assert minimum_time([[0, 2, 4], [3, 2, 1], [1, 0, 4]]) == -1


def test_minimum_time_two_by_two_open():
    assert minimum_time([[0, 0], [0, 0]]) == 2


def test_minimum_time_bounce_to_wait():
    assert minimum_time([[0, 1], [9, 9]]) == 10


def test_minimum_time_parity_adjustment():
    assert minimum_time([[0, 1, 1], [9, 9, 6]]) == 7
