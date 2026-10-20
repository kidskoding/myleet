from solution import is_rectangle_cover


def test_is_rectangle_cover_exact():
    rectangles = [[1, 1, 3, 3], [3, 1, 4, 2], [3, 2, 4, 4], [1, 3, 2, 4], [2, 3, 3, 4]]
    assert is_rectangle_cover(rectangles) is True


def test_is_rectangle_cover_with_gap():
    rectangles = [[1, 1, 2, 3], [1, 3, 2, 4], [3, 1, 4, 2], [3, 2, 4, 4]]
    assert is_rectangle_cover(rectangles) is False
