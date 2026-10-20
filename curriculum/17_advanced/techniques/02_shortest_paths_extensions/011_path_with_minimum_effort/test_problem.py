from solution import minimum_effort_path


def test_minimum_effort_path_normal():
    assert minimum_effort_path([[1, 2, 2], [3, 8, 2], [5, 3, 5]]) == 2


def test_minimum_effort_path_gentler_route():
    assert minimum_effort_path([[1, 2, 3], [3, 8, 4], [5, 3, 5]]) == 1
