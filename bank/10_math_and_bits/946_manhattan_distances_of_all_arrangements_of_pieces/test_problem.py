from solution import distance_sum


def test_distance_sum_two_by_two():
    assert distance_sum(2, 2, 2) == 8


def test_distance_sum_single_row():
    assert distance_sum(1, 4, 3) == 20


def test_distance_sum_two_cells():
    assert distance_sum(1, 2, 2) == 1


def test_distance_sum_fill_every_cell():
    assert distance_sum(2, 3, 6) == 25


def test_distance_sum_column():
    assert distance_sum(3, 1, 2) == 4


def test_distance_sum_large_grid_needs_modulo():
    assert distance_sum(1, 100000, 3) == 2367495
