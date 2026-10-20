from solution import shortest_distance


def test_shortest_distance_example():
    grid = [[1, 0, 2, 0, 1], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0]]
    assert shortest_distance(grid) == 7


def test_shortest_distance_single_row():
    assert shortest_distance([[1, 0]]) == 1


def test_shortest_distance_no_empty_land():
    assert shortest_distance([[1]]) == -1


def test_shortest_distance_building_walled_off():
    grid = [[1, 2, 0], [2, 2, 0], [0, 0, 1]]
    assert shortest_distance(grid) == -1


def test_shortest_distance_two_buildings_corridor():
    grid = [[1, 0, 0, 0, 1]]
    assert shortest_distance(grid) == 4


def test_shortest_distance_obstacle_detour():
    grid = [[1, 2, 1], [0, 0, 0]]
    assert shortest_distance(grid) == 4
