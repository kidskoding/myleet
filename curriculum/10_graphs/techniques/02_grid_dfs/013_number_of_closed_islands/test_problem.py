from solution import closed_island


def test_closed_island_normal_case():
    grid = [
        [1, 1, 1, 1, 1, 1, 1, 0],
        [1, 0, 0, 0, 0, 1, 1, 0],
        [1, 0, 1, 0, 1, 1, 1, 0],
        [1, 0, 0, 0, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 0],
    ]

    assert closed_island(grid) == 2


def test_closed_island_no_water():
    assert closed_island([[1, 1], [1, 1]]) == 0
