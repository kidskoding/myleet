from solution import max_points


def test_max_points_example_one():
    assert max_points([[1, 2, 3], [2, 5, 7], [3, 5, 1]], [5, 6, 2]) == [5, 8, 1]


def test_max_points_start_too_high():
    assert max_points([[5, 2, 1], [1, 1, 2]], [3]) == [0]


def test_max_points_single_cell():
    assert max_points([[4]], [4, 5]) == [0, 1]


def test_max_points_wall_blocks_low_cells():
    assert max_points([[1, 9, 1], [9, 9, 1]], [2, 10]) == [1, 6]


def test_max_points_duplicate_queries():
    assert max_points([[1, 2], [3, 4]], [3, 3, 1]) == [2, 2, 0]
