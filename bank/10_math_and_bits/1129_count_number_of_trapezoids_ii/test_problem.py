from solution import count_trapezoids


def test_count_trapezoids_two_trapezoids():
    assert count_trapezoids([[-3, 2], [3, 0], [2, 3], [3, 2], [2, -3]]) == 2


def test_count_trapezoids_single_trapezoid():
    assert count_trapezoids([[0, 0], [1, 0], [0, 1], [2, 1]]) == 1


def test_count_trapezoids_square_counted_once():
    assert count_trapezoids([[0, 0], [1, 0], [1, 1], [0, 1]]) == 1


def test_count_trapezoids_collinear_points():
    assert count_trapezoids([[0, 0], [1, 1], [2, 2], [3, 3]]) == 0


def test_count_trapezoids_center_point_is_collinear_with_corners():
    assert count_trapezoids([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]) == 1


def test_count_trapezoids_two_by_three_grid():
    assert count_trapezoids([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) == 9
