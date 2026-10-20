from solution import calculate_minimum_hp


def test_calculate_minimum_hp_example():
    assert calculate_minimum_hp([[-2, -3, 3], [-5, -10, 1], [10, 30, -5]]) == 7


def test_calculate_minimum_hp_single_empty_room():
    assert calculate_minimum_hp([[0]]) == 1


def test_calculate_minimum_hp_single_demon():
    assert calculate_minimum_hp([[-5]]) == 6


def test_calculate_minimum_hp_single_orb():
    assert calculate_minimum_hp([[100]]) == 1


def test_calculate_minimum_hp_choose_cheaper_path():
    assert calculate_minimum_hp([[0, -3], [-2, 0]]) == 3


def test_calculate_minimum_hp_orb_too_late():
    assert calculate_minimum_hp([[1, -3, 3]]) == 3
