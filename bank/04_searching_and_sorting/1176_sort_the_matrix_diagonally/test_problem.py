from solution import diagonal_sort


def test_diagonal_sort_wide():
    assert diagonal_sort([[3, 3, 1, 1], [2, 2, 1, 2], [1, 1, 1, 2]]) == [[1, 1, 1, 1], [1, 2, 2, 2], [1, 2, 3, 3]]


def test_diagonal_sort_larger():
    mat = [
        [11, 25, 66, 1, 69, 7],
        [23, 55, 17, 45, 15, 52],
        [75, 31, 36, 44, 58, 8],
        [22, 27, 33, 25, 68, 4],
        [84, 28, 14, 11, 5, 50],
    ]
    assert diagonal_sort(mat) == [
        [5, 17, 4, 1, 52, 7],
        [11, 11, 25, 45, 8, 69],
        [14, 23, 25, 44, 58, 15],
        [22, 27, 31, 36, 50, 66],
        [84, 28, 75, 33, 55, 68],
    ]


def test_diagonal_sort_single_cell():
    assert diagonal_sort([[7]]) == [[7]]


def test_diagonal_sort_single_row_unchanged():
    assert diagonal_sort([[3, 1, 2]]) == [[3, 1, 2]]


def test_diagonal_sort_single_column_unchanged():
    assert diagonal_sort([[3], [1], [2]]) == [[3], [1], [2]]


def test_diagonal_sort_two_by_two():
    assert diagonal_sort([[4, 2], [1, 3]]) == [[3, 2], [1, 4]]
