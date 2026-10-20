from solution import visible_points


def test_visible_points_all_in_view():
    assert visible_points([[2, 1], [2, 2], [3, 3]], 90, [1, 1]) == 3


def test_visible_points_includes_point_at_location():
    assert visible_points([[2, 1], [2, 2], [3, 4], [1, 1]], 90, [1, 1]) == 4


def test_visible_points_narrow_angle():
    assert visible_points([[1, 0], [2, 1]], 13, [1, 1]) == 1


def test_visible_points_wraparound():
    assert visible_points([[2, 1], [2, -1], [-1, 0]], 90, [0, 0]) == 2


def test_visible_points_zero_angle_same_direction():
    assert visible_points([[1, 1], [2, 2], [3, 3], [1, 0]], 0, [0, 0]) == 3


def test_visible_points_full_circle():
    assert visible_points([[1, 0], [0, 1], [-1, 0], [0, -1]], 360, [0, 0]) == 4
