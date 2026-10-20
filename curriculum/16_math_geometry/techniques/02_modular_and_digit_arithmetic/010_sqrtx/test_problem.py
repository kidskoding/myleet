from solution import my_sqrt


def test_my_sqrt_perfect_square():
    assert my_sqrt(4) == 2


def test_my_sqrt_rounds_down():
    assert my_sqrt(8) == 2


def test_my_sqrt_zero():
    assert my_sqrt(0) == 0


def test_my_sqrt_one():
    assert my_sqrt(1) == 1
