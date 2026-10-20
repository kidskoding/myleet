from solution import grid_illumination


def test_grid_illumination_example_one():
    assert grid_illumination(5, [[0, 0], [4, 4]], [[1, 1], [1, 0]]) == [1, 0]


def test_grid_illumination_example_two():
    assert grid_illumination(5, [[0, 0], [4, 4]], [[1, 1], [1, 1]]) == [1, 1]


def test_grid_illumination_example_three():
    assert grid_illumination(5, [[0, 0], [0, 4]], [[0, 4], [0, 1], [1, 4]]) == [1, 1, 0]


def test_grid_illumination_duplicate_lamps_turn_off_once():
    assert grid_illumination(3, [[1, 1], [1, 1]], [[1, 1], [1, 1]]) == [1, 0]


def test_grid_illumination_anti_diagonal():
    assert grid_illumination(4, [[0, 3]], [[3, 0], [2, 1], [1, 1]]) == [1, 1, 0]


def test_grid_illumination_huge_grid():
    assert grid_illumination(10**9, [[5, 5]], [[999999999, 999999999], [0, 11]]) == [1, 0]
