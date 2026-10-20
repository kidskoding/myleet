from solution import max_increase_keeping_skyline


def test_max_increase_keeping_skyline_example():
    grid = [[3, 0, 8, 4], [2, 4, 5, 7], [9, 2, 6, 3], [0, 3, 1, 0]]
    assert max_increase_keeping_skyline(grid) == 35


def test_max_increase_keeping_skyline_all_zero():
    assert max_increase_keeping_skyline([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) == 0


def test_max_increase_keeping_skyline_single_cell():
    assert max_increase_keeping_skyline([[5]]) == 0


def test_max_increase_keeping_skyline_two_by_two():
    assert max_increase_keeping_skyline([[1, 2], [3, 4]]) == 1
