from solution import max_area


def test_max_area_example_two_by_two():
    assert max_area([[1, 1, 1, 0], [1, 1, 1, 1], [0, 0, 1, 1]]) == 4


def test_max_area_diagonal_cells():
    assert max_area([[0, 1], [1, 0]]) == 1


def test_max_area_single_usable_cell():
    assert max_area([[0, 0], [0, 1]]) == 0


def test_max_area_full_square_grid():
    assert max_area([[1] * 4 for _ in range(4)]) == 4


def test_max_area_single_row():
    assert max_area([[1, 1, 1]]) == 1


def test_max_area_wide_grid():
    assert max_area([[1] * 6 for _ in range(3)]) == 9
