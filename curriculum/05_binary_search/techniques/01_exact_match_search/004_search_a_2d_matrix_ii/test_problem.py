from solution import search_matrix_ii


def test_search_matrix_ii_found():
    matrix = [
        [1, 4, 7, 11, 15],
        [2, 5, 8, 12, 19],
        [3, 6, 9, 16, 22],
        [10, 13, 14, 17, 24],
        [18, 21, 23, 26, 30],
    ]
    assert search_matrix_ii(matrix, 5) is True


def test_search_matrix_ii_not_found():
    matrix = [
        [1, 4, 7, 11, 15],
        [2, 5, 8, 12, 19],
        [3, 6, 9, 16, 22],
        [10, 13, 14, 17, 24],
        [18, 21, 23, 26, 30],
    ]
    assert search_matrix_ii(matrix, 20) is False


def test_search_matrix_ii_empty():
    assert search_matrix_ii([], 1) is False
