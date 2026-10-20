from solution import matrix_median


def test_matrix_median_square():
    assert matrix_median([[1, 1, 2], [2, 3, 3], [1, 3, 4]]) == 2


def test_matrix_median_single_row():
    assert matrix_median([[1, 1, 3, 3, 4]]) == 3


def test_matrix_median_single_cell():
    assert matrix_median([[7]]) == 7


def test_matrix_median_single_column():
    assert matrix_median([[1], [2], [3]]) == 2


def test_matrix_median_all_equal():
    assert matrix_median([[4, 4, 4], [4, 4, 4], [4, 4, 4]]) == 4


def test_matrix_median_rows_interleave():
    assert matrix_median([[1, 10, 20], [2, 3, 30], [4, 5, 6]]) == 5
