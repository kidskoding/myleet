from solution import minimum_effort_path


def test_minimum_effort_path_normal_case():
    heights = [[1, 2, 2], [3, 8, 2], [5, 3, 5]]

    assert minimum_effort_path(heights) == 2


def test_minimum_effort_path_single_cell():
    assert minimum_effort_path([[5]]) == 0
