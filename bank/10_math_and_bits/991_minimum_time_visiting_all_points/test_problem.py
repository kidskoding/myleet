from solution import min_time_to_visit_all_points


def test_min_time_to_visit_all_points_example_one():
    assert min_time_to_visit_all_points([[1, 1], [3, 4], [-1, 0]]) == 7


def test_min_time_to_visit_all_points_horizontal():
    assert min_time_to_visit_all_points([[3, 2], [-2, 2]]) == 5


def test_min_time_to_visit_all_points_single():
    assert min_time_to_visit_all_points([[0, 0]]) == 0


def test_min_time_to_visit_all_points_repeated_point():
    assert min_time_to_visit_all_points([[1, 1], [1, 1], [2, 2]]) == 1


def test_min_time_to_visit_all_points_extremes():
    assert min_time_to_visit_all_points([[-1000, -1000], [1000, 1000]]) == 2000
