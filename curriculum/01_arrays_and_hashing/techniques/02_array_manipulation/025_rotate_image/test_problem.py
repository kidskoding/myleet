from solution import rotate_image


def test_rotate_image_three_by_three():
    matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    rotate_image(matrix)
    assert matrix == [[7, 4, 1], [8, 5, 2], [9, 6, 3]]


def test_rotate_image_two_by_two():
    matrix = [[1, 2], [3, 4]]
    rotate_image(matrix)
    assert matrix == [[3, 1], [4, 2]]


def test_rotate_image_single_cell():
    matrix = [[1]]
    rotate_image(matrix)
    assert matrix == [[1]]
