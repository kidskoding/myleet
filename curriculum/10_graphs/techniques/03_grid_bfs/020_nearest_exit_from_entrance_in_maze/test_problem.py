from solution import nearest_exit


def test_nearest_exit_normal_case():
    maze = [["+", "+", ".", "+"], [".", ".", ".", "+"], ["+", "+", "+", "."]]

    assert nearest_exit(maze, [1, 2]) == 1


def test_nearest_exit_no_exit():
    maze = [["+", "+", "+"], [".", ".", "."], ["+", "+", "+"]]

    assert nearest_exit(maze, [1, 0]) == -1
