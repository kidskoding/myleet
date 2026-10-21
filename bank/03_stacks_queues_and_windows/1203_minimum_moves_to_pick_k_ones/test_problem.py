from solution import minimum_moves


def test_minimum_moves_example_one():
    assert minimum_moves([1, 1, 0, 0, 0, 1, 1, 0, 0, 1], 3, 1) == 3


def test_minimum_moves_all_zeros_use_changes():
    assert minimum_moves([0, 0, 0, 0], 2, 3) == 4


def test_minimum_moves_enough_adjacent_ones():
    assert minimum_moves([1, 1, 1], 3, 0) == 2


def test_minimum_moves_single_one_with_changes():
    assert minimum_moves([1, 0], 2, 1) == 2


def test_minimum_moves_k_equals_one():
    assert minimum_moves([0, 1, 0], 1, 0) == 0
