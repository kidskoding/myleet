from solution import find_shortest_way

MAZE = [
    [0, 0, 0, 0, 0],
    [1, 1, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [0, 1, 0, 0, 1],
    [0, 1, 0, 0, 0],
]


def test_find_shortest_way_lexicographic_tie():
    assert find_shortest_way(MAZE, [4, 3], [0, 1]) == "lul"


def test_find_shortest_way_impossible():
    assert find_shortest_way(MAZE, [4, 3], [3, 0]) == "impossible"


def test_find_shortest_way_wider_maze():
    maze = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1],
    ]
    assert find_shortest_way(maze, [0, 4], [3, 5]) == "dldr"


def test_find_shortest_way_stops_in_hole_mid_roll():
    assert find_shortest_way([[0, 0, 0]], [0, 0], [0, 1]) == "r"


def test_find_shortest_way_straight_roll():
    assert find_shortest_way([[0, 0, 0]], [0, 2], [0, 0]) == "l"


def test_find_shortest_way_shorter_beats_lexicographic():
    maze = [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ]
    # From the top-left corner, "d" then "r" and "r" then "d" both take 4 steps.
    assert find_shortest_way(maze, [0, 0], [2, 2]) == "dr"
