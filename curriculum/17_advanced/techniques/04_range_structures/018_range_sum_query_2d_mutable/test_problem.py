from solution import NumMatrix


def test_num_matrix_sum_region():
    matrix = [[3, 0, 1, 4], [5, 6, 3, 2], [1, 2, 0, 1], [4, 3, 4, 6]]
    num_matrix = NumMatrix(matrix)
    assert num_matrix.sum_region(2, 1, 3, 3) == 16


def test_num_matrix_update_then_sum_region():
    matrix = [[3, 0, 1, 4], [5, 6, 3, 2], [1, 2, 0, 1], [4, 3, 4, 6]]
    num_matrix = NumMatrix(matrix)
    num_matrix.update(3, 2, 2)
    assert num_matrix.sum_region(2, 1, 3, 3) == 14


def test_num_matrix_single_cell():
    num_matrix = NumMatrix([[5]])
    assert num_matrix.sum_region(0, 0, 0, 0) == 5
