from solution import min_path_sum


def test_min_path_sum_single_cell():
    assert min_path_sum([[5]]) == 5


def test_min_path_sum_normal():
    grid = [[1, 3, 1], [1, 5, 1], [4, 2, 1]]
    assert min_path_sum(grid) == 7


def test_min_path_sum_single_row():
    assert min_path_sum([[1, 2, 3]]) == 6
