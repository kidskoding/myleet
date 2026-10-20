from solution import color_border


def test_color_border_small_component():
    assert color_border([[1, 1], [1, 2]], 0, 0, 3) == [[3, 3], [3, 2]]


def test_color_border_component_on_edge():
    assert color_border([[1, 2, 2], [2, 3, 2]], 0, 1, 3) == [[1, 3, 3], [2, 3, 3]]


def test_color_border_interior_cell_kept():
    grid = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
    assert color_border(grid, 1, 1, 2) == [[2, 2, 2], [2, 1, 2], [2, 2, 2]]


def test_color_border_single_cell():
    assert color_border([[5]], 0, 0, 7) == [[7]]


def test_color_border_same_color_unchanged():
    assert color_border([[1, 2], [2, 2]], 1, 1, 2) == [[1, 2], [2, 2]]


def test_color_border_island_inside_other_color():
    grid = [[2, 2, 2, 2], [2, 1, 1, 2], [2, 1, 1, 2], [2, 2, 2, 2]]
    assert color_border(grid, 1, 1, 9) == [[2, 2, 2, 2], [2, 9, 9, 2], [2, 9, 9, 2], [2, 2, 2, 2]]
