from solution import count_islands


def test_count_islands_example_one():
    grid = [[0, 2, 1, 0, 0], [0, 5, 0, 0, 5], [0, 0, 1, 0, 0], [0, 1, 4, 7, 0], [0, 2, 0, 0, 8]]
    assert count_islands(grid, 5) == 2


def test_count_islands_checkerboard():
    assert count_islands([[3, 0, 3, 0], [0, 3, 0, 3], [3, 0, 3, 0]], 3) == 6


def test_count_islands_all_water():
    assert count_islands([[0, 0], [0, 0]], 1) == 0


def test_count_islands_single_cell_divisible():
    assert count_islands([[5]], 5) == 1


def test_count_islands_single_cell_not_divisible():
    assert count_islands([[4]], 5) == 0


def test_count_islands_one_big_island():
    assert count_islands([[1, 2], [3, 4]], 10) == 1
