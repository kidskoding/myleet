from solution import common_factors


def test_common_factors_normal():
    assert common_factors(12, 6) == 4


def test_common_factors_coprime_ish():
    assert common_factors(25, 30) == 2


def test_common_factors_equal():
    assert common_factors(1, 1) == 1
