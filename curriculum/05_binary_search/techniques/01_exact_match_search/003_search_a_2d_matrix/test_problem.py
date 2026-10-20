from solution import search_matrix


def test_search_matrix_found():
    matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]
    assert search_matrix(matrix, 3) is True


def test_search_matrix_not_found():
    matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]
    assert search_matrix(matrix, 13) is False


def test_search_matrix_single_cell():
    assert search_matrix([[5]], 5) is True


def test_search_matrix_empty():
    assert search_matrix([], 1) is False
