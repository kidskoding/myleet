from solution import minimum_lines


def test_minimum_lines_example_one():
    assert minimum_lines([[0, 1], [2, 3], [4, 5], [4, 3]]) == 2


def test_minimum_lines_all_collinear():
    assert minimum_lines([[0, 2], [-2, -2], [1, 4]]) == 1


def test_minimum_lines_single_point():
    assert minimum_lines([[3, 3]]) == 1


def test_minimum_lines_two_points():
    assert minimum_lines([[0, 0], [5, -7]]) == 1


def test_minimum_lines_square_corners():
    assert minimum_lines([[0, 0], [0, 1], [1, 0], [1, 1]]) == 2


def test_minimum_lines_no_three_collinear():
    assert minimum_lines([[0, 0], [1, 2], [2, 1], [3, 5], [5, 3]]) == 3
