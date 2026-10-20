from solution import minimum_levels


def test_minimum_levels_alternating():
    assert minimum_levels([1, 0, 1, 0]) == 1


def test_minimum_levels_all_clearable():
    assert minimum_levels([1, 1, 1, 1, 1]) == 3


def test_minimum_levels_all_impossible():
    assert minimum_levels([0, 0]) == -1


def test_minimum_levels_tie_of_two():
    assert minimum_levels([1, 1]) == -1


def test_minimum_levels_bob_needs_last_level():
    assert minimum_levels([0, 1]) == -1


def test_minimum_levels_first_level_wins():
    assert minimum_levels([1, 0]) == 1
