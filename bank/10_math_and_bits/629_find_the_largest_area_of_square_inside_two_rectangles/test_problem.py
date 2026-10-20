from solution import largest_square_area


def test_largest_square_area_example_one():
    assert largest_square_area([[1, 1], [2, 2], [3, 1]], [[3, 3], [4, 4], [6, 6]]) == 1


def test_largest_square_area_example_two():
    assert largest_square_area([[1, 1], [1, 3], [1, 5]], [[5, 5], [5, 7], [5, 9]]) == 4


def test_largest_square_area_example_three():
    assert largest_square_area([[1, 1], [2, 2], [1, 2]], [[3, 3], [4, 4], [3, 4]]) == 1


def test_largest_square_area_touching_corners_only():
    assert largest_square_area([[1, 1], [3, 3], [3, 1]], [[2, 2], [4, 4], [4, 2]]) == 0


def test_largest_square_area_nested_rectangles():
    assert largest_square_area([[0, 0], [2, 1]], [[10, 10], [7, 9]]) == 25
