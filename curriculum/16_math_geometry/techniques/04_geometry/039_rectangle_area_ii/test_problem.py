from solution import rectangle_area


def test_rectangle_area_overlapping():
    assert rectangle_area([[0, 0, 2, 2], [1, 0, 2, 3], [1, 0, 3, 1]]) == 6


def test_rectangle_area_takes_modulo():
    assert rectangle_area([[0, 0, 1000000000, 1000000000]]) == 49
