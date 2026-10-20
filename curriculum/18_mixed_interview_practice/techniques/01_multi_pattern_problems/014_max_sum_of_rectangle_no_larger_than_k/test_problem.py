from solution import max_sum_submatrix


def test_max_sum_submatrix_normal():
    assert max_sum_submatrix([[1, 0, 1], [0, -2, 3]], 2) == 2


def test_max_sum_submatrix_single_row():
    assert max_sum_submatrix([[2, 2, -1]], 3) == 3
