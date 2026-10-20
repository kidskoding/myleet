from solution import matrix_reshape


def test_matrix_reshape_to_single_row():
    assert matrix_reshape([[1, 2], [3, 4]], 1, 4) == [[1, 2, 3, 4]]


def test_matrix_reshape_impossible_returns_original():
    assert matrix_reshape([[1, 2], [3, 4]], 2, 4) == [[1, 2], [3, 4]]


def test_matrix_reshape_to_single_column():
    assert matrix_reshape([[1, 2], [3, 4]], 4, 1) == [[1], [2], [3], [4]]


def test_matrix_reshape_same_shape():
    assert matrix_reshape([[1, 2, 3]], 1, 3) == [[1, 2, 3]]


def test_matrix_reshape_rows_to_columns():
    assert matrix_reshape([[1, 2, 3], [4, 5, 6]], 3, 2) == [[1, 2], [3, 4], [5, 6]]
