import pytest
from solution import probability_of_heads


def test_probability_of_heads_single_coin():
    assert probability_of_heads([0.4], 1) == pytest.approx(0.4)


def test_probability_of_heads_all_tails():
    assert probability_of_heads([0.5, 0.5, 0.5, 0.5, 0.5], 0) == pytest.approx(0.03125)


def test_probability_of_heads_certain_coins():
    assert probability_of_heads([1.0, 1.0], 2) == pytest.approx(1.0)


def test_probability_of_heads_impossible():
    assert probability_of_heads([0.0, 1.0], 2) == pytest.approx(0.0)


def test_probability_of_heads_two_unequal_coins():
    assert probability_of_heads([0.2, 0.6], 1) == pytest.approx(0.56)


def test_probability_of_heads_two_fair_coins_one_head():
    assert probability_of_heads([0.5, 0.5], 1) == pytest.approx(0.5)
