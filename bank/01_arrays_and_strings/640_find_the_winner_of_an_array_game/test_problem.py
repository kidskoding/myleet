from solution import get_winner


def test_get_winner_example_one():
    assert get_winner([2, 1, 3, 5, 4, 6, 7], 2) == 5


def test_get_winner_large_k_returns_max():
    assert get_winner([3, 2, 1], 10) == 3


def test_get_winner_max_in_middle():
    assert get_winner([1, 9, 8, 2, 3, 7, 6, 4, 5], 7) == 9


def test_get_winner_huge_k():
    assert get_winner([1, 11, 22, 33, 44, 55, 66, 77, 88, 99], 1000000000) == 99


def test_get_winner_k_one():
    assert get_winner([1, 25, 35, 42, 68, 70], 1) == 25


def test_get_winner_two_elements():
    assert get_winner([2, 1], 1) == 2
