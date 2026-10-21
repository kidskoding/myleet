from solution import matrix_sum_queries


def test_matrix_sum_queries_example_one():
    assert matrix_sum_queries(3, [[0, 0, 1], [1, 2, 2], [0, 2, 3], [1, 0, 4]]) == 23


def test_matrix_sum_queries_example_two():
    assert matrix_sum_queries(3, [[0, 0, 4], [0, 1, 2], [1, 0, 1], [0, 2, 3], [1, 2, 1]]) == 17


def test_matrix_sum_queries_overwrite_row():
    assert matrix_sum_queries(2, [[0, 0, 5], [0, 0, 1]]) == 2


def test_matrix_sum_queries_single():
    assert matrix_sum_queries(1, [[0, 0, 7]]) == 7


def test_matrix_sum_queries_cols_only():
    assert matrix_sum_queries(2, [[1, 0, 3], [1, 1, 4]]) == 14
