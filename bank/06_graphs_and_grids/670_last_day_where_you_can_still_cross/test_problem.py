from solution import latest_day_to_cross


def test_latest_day_to_cross_example_one():
    assert latest_day_to_cross(2, 2, [[1, 1], [2, 1], [1, 2], [2, 2]]) == 2


def test_latest_day_to_cross_example_two():
    assert latest_day_to_cross(2, 2, [[1, 1], [1, 2], [2, 1], [2, 2]]) == 1


def test_latest_day_to_cross_example_three():
    cells = [[1, 2], [2, 1], [3, 3], [2, 2], [1, 1], [1, 3], [2, 3], [3, 2], [3, 1]]
    assert latest_day_to_cross(3, 3, cells) == 3


def test_latest_day_to_cross_single_column():
    assert latest_day_to_cross(2, 1, [[2, 1], [1, 1]]) == 0


def test_latest_day_to_cross_wide_grid():
    cells = [[1, 1], [2, 2], [1, 3], [2, 3], [1, 2], [2, 1]]
    assert latest_day_to_cross(2, 3, cells) == 2
