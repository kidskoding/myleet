from solution import unique_paths_with_obstacles


def test_unique_paths_with_obstacles_no_obstacle():
    assert unique_paths_with_obstacles([[0, 0], [0, 0]]) == 2


def test_unique_paths_with_obstacles_normal():
    grid = [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
    assert unique_paths_with_obstacles(grid) == 2


def test_unique_paths_with_obstacles_start_blocked():
    assert unique_paths_with_obstacles([[1, 0]]) == 0
