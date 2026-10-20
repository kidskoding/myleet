import pytest
from solution import champagne_tower


def test_champagne_tower_one_cup_stays_on_top():
    assert champagne_tower(1, 1, 1) == pytest.approx(0.0)


def test_champagne_tower_two_cups_split():
    assert champagne_tower(2, 1, 1) == pytest.approx(0.5)


def test_champagne_tower_huge_pour_fills_glass():
    assert champagne_tower(100000009, 33, 17) == pytest.approx(1.0)


def test_champagne_tower_nothing_poured():
    assert champagne_tower(0, 0, 0) == pytest.approx(0.0)


def test_champagne_tower_middle_gets_more_than_edge():
    assert champagne_tower(4, 2, 1) == pytest.approx(0.5)
    assert champagne_tower(4, 2, 0) == pytest.approx(0.25)
