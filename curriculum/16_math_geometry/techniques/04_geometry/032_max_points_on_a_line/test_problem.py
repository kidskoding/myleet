from solution import max_points


def test_max_points_collinear():
    points = [[1, 1], [2, 2], [3, 3]]
    assert max_points(points) == 3


def test_max_points_single_point():
    assert max_points([[0, 0]]) == 1


def test_max_points_vertical_line():
    points = [[1, 1], [1, 2], [1, 3], [2, 5]]
    assert max_points(points) == 3
