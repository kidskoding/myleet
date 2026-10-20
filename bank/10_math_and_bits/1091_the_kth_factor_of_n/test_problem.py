from solution import kth_factor


def test_kth_factor_twelve():
    assert kth_factor(12, 3) == 3


def test_kth_factor_prime():
    assert kth_factor(7, 2) == 7


def test_kth_factor_too_few_factors():
    assert kth_factor(4, 4) == -1


def test_kth_factor_one():
    assert kth_factor(1, 1) == 1


def test_kth_factor_perfect_square():
    assert kth_factor(16, 3) == 4
    assert kth_factor(16, 4) == 8


def test_kth_factor_last_factor():
    assert kth_factor(1000, 16) == 1000
