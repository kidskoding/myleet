import pytest
from solution import knight_probability


def test_knight_probability_example():
    assert knight_probability(3, 2, 0, 0) == pytest.approx(0.0625)


def test_knight_probability_zero_moves():
    assert knight_probability(1, 0, 0, 0) == pytest.approx(1.0)


def test_knight_probability_tiny_board():
    assert knight_probability(1, 1, 0, 0) == pytest.approx(0.0)


def test_knight_probability_center_of_three_by_three():
    assert knight_probability(3, 1, 1, 1) == pytest.approx(0.0)


def test_knight_probability_one_move_from_corner():
    assert knight_probability(3, 1, 0, 0) == pytest.approx(0.25)


def test_knight_probability_large_board_stays_on():
    assert knight_probability(8, 1, 3, 3) == pytest.approx(1.0)
