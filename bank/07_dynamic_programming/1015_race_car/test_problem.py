from solution import racecar


def test_racecar_three():
    assert racecar(3) == 2


def test_racecar_six():
    assert racecar(6) == 5


def test_racecar_one():
    assert racecar(1) == 1


def test_racecar_needs_reverse_back():
    assert racecar(4) == 5


def test_racecar_power_of_two_minus_one():
    assert racecar(7) == 3


def test_racecar_larger_target():
    assert racecar(100) == 19
