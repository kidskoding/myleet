from solution import minimum_moves


def test_minimum_moves_example_one():
    assert minimum_moves([[1, 1, 0], [1, 1, 1], [1, 2, 1]]) == 3


def test_minimum_moves_example_two():
    assert minimum_moves([[1, 3, 0], [1, 0, 0], [1, 0, 3]]) == 4


def test_minimum_moves_already_spread():
    assert minimum_moves([[1, 1, 1], [1, 1, 1], [1, 1, 1]]) == 0


def test_minimum_moves_all_in_center():
    assert minimum_moves([[0, 0, 0], [0, 9, 0], [0, 0, 0]]) == 12


def test_minimum_moves_all_in_corner():
    assert minimum_moves([[9, 0, 0], [0, 0, 0], [0, 0, 0]]) == 18
