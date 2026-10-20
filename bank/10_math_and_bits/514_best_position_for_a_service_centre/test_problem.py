from solution import get_min_dist_sum


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-5


def test_get_min_dist_sum_symmetric_diamond():
    assert close(get_min_dist_sum([[0, 1], [1, 0], [1, 2], [2, 1]]), 4.0)


def test_get_min_dist_sum_two_points():
    assert close(get_min_dist_sum([[1, 1], [3, 3]]), 2.8284271247)


def test_get_min_dist_sum_single_point():
    assert close(get_min_dist_sum([[5, 7]]), 0.0)


def test_get_min_dist_sum_collinear_points_use_median():
    assert close(get_min_dist_sum([[0, 0], [2, 0], [10, 0]]), 10.0)


def test_get_min_dist_sum_duplicates():
    assert close(get_min_dist_sum([[3, 3], [3, 3], [3, 3]]), 0.0)


def test_get_min_dist_sum_equilateral_triangle():
    assert close(get_min_dist_sum([[0, 0], [2, 0], [1, 3**0.5]]), 2 * 3**0.5)
