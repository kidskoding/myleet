from solution import NumMatrix


def test_num_matrix_sum_region_normal():
    matrix = [
        [3, 0, 1, 4, 2],
        [5, 6, 3, 2, 1],
        [1, 2, 0, 1, 5],
        [4, 1, 0, 1, 7],
        [1, 0, 3, 0, 5],
    ]
    num_matrix = NumMatrix(matrix)
    assert num_matrix.sum_region(2, 1, 4, 3) == 8
    assert num_matrix.sum_region(1, 1, 2, 2) == 11
    assert num_matrix.sum_region(1, 2, 2, 4) == 12


def test_num_matrix_sum_region_single_cell():
    num_matrix = NumMatrix([[5]])
    assert num_matrix.sum_region(0, 0, 0, 0) == 5
