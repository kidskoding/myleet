from solution import find_peak_grid


def test_find_peak_grid_two_by_two():
    assert find_peak_grid([[1, 4], [3, 2]]) in ([0, 1], [1, 0])


def test_find_peak_grid_three_by_three():
    assert find_peak_grid([[10, 20, 15], [21, 30, 14], [7, 16, 32]]) in ([1, 1], [2, 2])


def test_find_peak_grid_single_cell():
    assert find_peak_grid([[1]]) == [0, 0]
