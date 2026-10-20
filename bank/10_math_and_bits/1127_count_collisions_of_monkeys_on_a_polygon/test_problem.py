from solution import monkey_move


def test_monkey_move_triangle():
    assert monkey_move(3) == 6


def test_monkey_move_square():
    assert monkey_move(4) == 14


def test_monkey_move_pentagon():
    assert monkey_move(5) == 30


def test_monkey_move_large_n_reduced_modulo():
    assert monkey_move(10**9) == 140624999


def test_monkey_move_power_wraps_below_two():
    assert monkey_move(500000003) == 1000000006
