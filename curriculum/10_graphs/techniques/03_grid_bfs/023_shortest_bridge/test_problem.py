from solution import shortest_bridge


def test_shortest_bridge_normal_case():
    assert shortest_bridge([[0, 1], [1, 0]]) == 1


def test_shortest_bridge_adjacent_islands_across_gap():
    grid = [[0, 1, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, 1]]

    assert shortest_bridge(grid) == 2
