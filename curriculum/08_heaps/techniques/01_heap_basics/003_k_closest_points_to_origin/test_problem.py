from solution import k_closest_points


def test_k_closest_points_normal():
    result = k_closest_points([[1, 3], [-2, 2]], 1)
    assert result == [[-2, 2]]


def test_k_closest_points_all_points():
    points = [[3, 3], [5, -1], [-2, 4]]
    result = k_closest_points(points, 2)
    assert sorted(result) == sorted([[3, 3], [-2, 4]])


def test_k_closest_points_single():
    assert k_closest_points([[0, 1]], 1) == [[0, 1]]
