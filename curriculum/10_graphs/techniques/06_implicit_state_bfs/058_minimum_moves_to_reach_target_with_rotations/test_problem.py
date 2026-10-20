from solution import minimum_moves


def test_minimum_moves_normal_case():
    grid = [
        [0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
    ]

    assert minimum_moves(grid) == 11


def test_minimum_moves_smallest_grid():
    assert minimum_moves([[0, 0], [0, 0]]) == 1
