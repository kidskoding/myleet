from solution import generate_matrix


def test_generate_matrix_normal():
    assert generate_matrix(3) == [[1, 2, 3], [8, 9, 4], [7, 6, 5]]


def test_generate_matrix_single():
    assert generate_matrix(1) == [[1]]
