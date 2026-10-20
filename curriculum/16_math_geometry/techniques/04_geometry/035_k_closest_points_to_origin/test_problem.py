from solution import k_closest


def test_k_closest_single_point():
    assert k_closest([[1, 3], [-2, 2]], 1) == [[-2, 2]]


def test_k_closest_two_points():
    assert sorted(k_closest([[3, 3], [5, -1], [-2, 4]], 2)) == sorted([[3, 3], [-2, 4]])
