from solution import minimum_total


def test_minimum_total_single_row():
    assert minimum_total([[1]]) == 1


def test_minimum_total_normal():
    triangle = [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]
    assert minimum_total(triangle) == 11
