from solution import modified_matrix


def test_modified_matrix_example_one():
    assert modified_matrix([[1, 2, -1], [4, -1, 6], [7, 8, 9]]) == [[1, 2, 9], [4, 8, 6], [7, 8, 9]]


def test_modified_matrix_example_two():
    assert modified_matrix([[3, -1], [5, 2]]) == [[3, 2], [5, 2]]


def test_modified_matrix_no_negatives():
    assert modified_matrix([[1, 2], [3, 4]]) == [[1, 2], [3, 4]]


def test_modified_matrix_several_in_column():
    assert modified_matrix([[-1, 0], [-1, 1], [5, -1]]) == [[5, 0], [5, 1], [5, 1]]
