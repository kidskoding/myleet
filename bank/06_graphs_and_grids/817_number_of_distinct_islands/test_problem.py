from solution import num_distinct_islands


def test_num_distinct_islands_two_identical_squares():
    grid = [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 0, 1, 1], [0, 0, 0, 1, 1]]
    assert num_distinct_islands(grid) == 1


def test_num_distinct_islands_mixed_shapes():
    grid = [[1, 1, 0, 1, 1], [1, 0, 0, 0, 0], [0, 0, 0, 0, 1], [1, 1, 0, 1, 1]]
    assert num_distinct_islands(grid) == 3


def test_num_distinct_islands_all_water():
    assert num_distinct_islands([[0, 0], [0, 0]]) == 0


def test_num_distinct_islands_single_cell():
    assert num_distinct_islands([[1]]) == 1


def test_num_distinct_islands_rotation_counts_as_different():
    grid = [[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1]]
    assert num_distinct_islands(grid) == 2


def test_num_distinct_islands_many_single_cells():
    grid = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]
    assert num_distinct_islands(grid) == 1
