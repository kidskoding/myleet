from solution import min_cost_connect_points


def test_min_cost_connect_points_normal():
    points = [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]
    assert min_cost_connect_points(points) == 20


def test_min_cost_connect_points_two_points():
    assert min_cost_connect_points([[0, 0], [1, 1]]) == 2


def test_min_cost_connect_points_single_point():
    assert min_cost_connect_points([[3, 3]]) == 0
