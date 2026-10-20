from solution import closest_pair


def test_closest_pair_two_points():
    assert closest_pair([[0, 0], [3, 4]]) == 5.0


def test_closest_pair_normal():
    points = [[2, 3], [12, 30], [40, 50], [5, 1], [12, 10], [3, 4]]
    assert closest_pair(points) == 1.4142135623730951


def test_closest_pair_duplicate_points():
    assert closest_pair([[1, 1], [1, 1], [5, 5]]) == 0.0
