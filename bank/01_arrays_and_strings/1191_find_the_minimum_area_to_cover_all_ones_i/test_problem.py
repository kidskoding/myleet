from solution import minimum_area


def test_minimum_area_scattered():
    assert minimum_area([[0, 1, 0], [1, 0, 1]]) == 6


def test_minimum_area_single():
    assert minimum_area([[1, 0], [0, 0]]) == 1


def test_minimum_area_full_block():
    assert minimum_area([[1, 1], [1, 1]]) == 4


def test_minimum_area_one_row():
    assert minimum_area([[0, 1, 1, 0]]) == 2
