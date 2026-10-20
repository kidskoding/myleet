from solution import get_sum


def test_get_sum_normal():
    assert get_sum(1, 2) == 3


def test_get_sum_with_carry():
    assert get_sum(2, 3) == 5


def test_get_sum_zero():
    assert get_sum(0, 0) == 0


def test_get_sum_negative():
    assert get_sum(-2, 3) == 1


def test_get_sum_both_negative():
    assert get_sum(-5, -7) == -12
