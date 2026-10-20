from solution import rotate


def test_rotate_single_cell():
    matrix = [[1]]
    rotate(matrix)
    assert matrix == [[1]]


def test_rotate_three_by_three():
    matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    rotate(matrix)
    assert matrix == [[7, 4, 1], [8, 5, 2], [9, 6, 3]]


def test_rotate_two_by_two():
    matrix = [[1, 2], [3, 4]]
    rotate(matrix)
    assert matrix == [[3, 1], [4, 2]]
