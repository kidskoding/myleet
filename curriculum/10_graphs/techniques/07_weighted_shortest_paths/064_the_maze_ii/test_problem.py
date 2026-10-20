from solution import shortest_distance


def test_shortest_distance_normal_case():
    maze = [
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
    ]

    assert shortest_distance(maze, [0, 4], [4, 4]) == 12


def test_shortest_distance_unreachable():
    maze = [
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
    ]

    assert shortest_distance(maze, [0, 4], [3, 2]) == -1
