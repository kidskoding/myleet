from solution import has_path


def test_has_path_true():
    maze = [
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
    ]

    assert has_path(maze, [0, 4], [4, 4]) is True


def test_has_path_false():
    maze = [
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
    ]

    assert has_path(maze, [0, 4], [3, 2]) is False
