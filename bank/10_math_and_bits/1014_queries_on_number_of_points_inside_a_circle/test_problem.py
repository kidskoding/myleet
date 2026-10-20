from solution import count_points


def test_count_points_example_one():
    points = [[1, 3], [3, 3], [5, 3], [2, 2]]
    assert count_points(points, [[2, 3, 1], [4, 3, 1], [1, 1, 2]]) == [3, 2, 2]


def test_count_points_example_two():
    points = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]
    assert count_points(points, [[1, 2, 2], [2, 2, 2], [4, 3, 2], [4, 3, 3]]) == [2, 3, 2, 4]


def test_count_points_on_boundary_counts():
    assert count_points([[3, 4]], [[0, 0, 5]]) == [1]


def test_count_points_just_outside():
    assert count_points([[2, 0]], [[0, 0, 1]]) == [0]


def test_count_points_duplicate_points():
    assert count_points([[1, 1], [1, 1]], [[1, 1, 1], [5, 5, 1]]) == [2, 0]
