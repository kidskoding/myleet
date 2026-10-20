from solution import unique_paths_iii


def test_unique_paths_iii_with_obstacle():
    assert unique_paths_iii([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, -1]]) == 2


def test_unique_paths_iii_open_grid():
    assert unique_paths_iii([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]]) == 4


def test_unique_paths_iii_unreachable():
    assert unique_paths_iii([[0, 1], [2, 0]]) == 0
