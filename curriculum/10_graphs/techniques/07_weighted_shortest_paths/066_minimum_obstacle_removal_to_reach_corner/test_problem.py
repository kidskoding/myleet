from solution import minimum_obstacles


def test_minimum_obstacles_normal_case():
    grid = [[0, 1, 1], [1, 1, 0], [1, 1, 0]]

    assert minimum_obstacles(grid) == 2


def test_minimum_obstacles_no_obstacles():
    assert minimum_obstacles([[0, 0], [0, 0]]) == 0
