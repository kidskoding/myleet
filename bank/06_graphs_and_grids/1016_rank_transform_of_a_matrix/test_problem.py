from solution import matrix_rank_transform


def test_matrix_rank_transform_distinct_values():
    assert matrix_rank_transform([[1, 2], [3, 4]]) == [[1, 2], [2, 3]]


def test_matrix_rank_transform_all_equal():
    assert matrix_rank_transform([[7, 7], [7, 7]]) == [[1, 1], [1, 1]]


def test_matrix_rank_transform_negatives_and_ties():
    matrix = [[20, -21, 14], [-19, 4, 19], [22, -47, 24], [-19, 4, 19]]
    assert matrix_rank_transform(matrix) == [[4, 2, 3], [1, 3, 4], [5, 1, 6], [1, 3, 4]]


def test_matrix_rank_transform_single_cell():
    assert matrix_rank_transform([[5]]) == [[1]]


def test_matrix_rank_transform_equal_values_linked_through_chain():
    matrix = [[1, 2, 3], [3, 1, 2], [2, 3, 1]]
    assert matrix_rank_transform(matrix) == [[1, 2, 3], [3, 1, 2], [2, 3, 1]]


def test_matrix_rank_transform_single_row():
    assert matrix_rank_transform([[3, 1, 3, 2]]) == [[3, 1, 3, 2]]
