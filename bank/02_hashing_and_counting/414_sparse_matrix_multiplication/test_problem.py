from solution import multiply


def test_multiply_example():
    mat1 = [[1, 0, 0], [-1, 0, 3]]
    mat2 = [[7, 0, 0], [0, 0, 0], [0, 0, 1]]
    assert multiply(mat1, mat2) == [[7, 0, 0], [-7, 0, 3]]


def test_multiply_single_zero():
    assert multiply([[0]], [[0]]) == [[0]]


def test_multiply_non_square():
    mat1 = [[1, 2]]
    mat2 = [[1, 0, 2], [0, 3, 0]]
    assert multiply(mat1, mat2) == [[1, 6, 2]]


def test_multiply_all_zero_row():
    mat1 = [[0, 0], [2, 0]]
    mat2 = [[4, 5], [6, 7]]
    assert multiply(mat1, mat2) == [[0, 0], [8, 10]]


def test_multiply_dense():
    assert multiply([[1, 2], [3, 4]], [[5, 6], [7, 8]]) == [[19, 22], [43, 50]]
