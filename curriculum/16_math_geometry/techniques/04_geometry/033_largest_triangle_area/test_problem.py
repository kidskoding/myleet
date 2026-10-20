from solution import largest_triangle_area


def test_largest_triangle_area_normal():
    assert largest_triangle_area([[0, 0], [0, 1], [1, 0], [0, 2], [2, 0]]) == 2.0


def test_largest_triangle_area_three_points():
    assert largest_triangle_area([[1, 0], [0, 0], [0, 1]]) == 0.5
