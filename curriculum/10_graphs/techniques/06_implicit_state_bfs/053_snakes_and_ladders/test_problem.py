from solution import snakes_and_ladders


def test_snakes_and_ladders_normal_case():
    board = [
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, 35, -1, -1, 13, -1],
        [-1, -1, -1, -1, -1, -1],
        [-1, 15, -1, -1, -1, -1],
    ]

    assert snakes_and_ladders(board) == 4


def test_snakes_and_ladders_single_cell():
    assert snakes_and_ladders([[-1]]) == 0
