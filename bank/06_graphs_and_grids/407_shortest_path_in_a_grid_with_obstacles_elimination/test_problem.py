from solution import shortest_path


def test_shortest_path_example_one():
    grid = [[0, 0, 0], [1, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 0]]
    assert shortest_path(grid, 1) == 6


def test_shortest_path_example_two():
    grid = [[0, 1, 1], [1, 1, 1], [1, 0, 0]]
    assert shortest_path(grid, 1) == -1


def test_shortest_path_single_cell():
    assert shortest_path([[0]], 0) == 0


def test_shortest_path_no_eliminations_needed():
    assert shortest_path([[0, 0], [0, 0]], 0) == 2


def test_shortest_path_must_break_wall():
    grid = [[0, 1], [1, 0]]
    assert shortest_path(grid, 0) == -1
    assert shortest_path(grid, 1) == 2


def test_shortest_path_breaking_shortcuts_detour():
    grid = [[0, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1], [1, 1, 1, 0]]
    assert shortest_path(grid, 0) == -1
    assert shortest_path(grid, 1) == 6
    assert shortest_path(grid, 2) == 6
