from solution import island_perimeter


def test_island_perimeter_single_cell():
    assert island_perimeter([[1]]) == 4


def test_island_perimeter_normal_case():
    grid = [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 1, 0, 0],
        [1, 1, 0, 0],
    ]

    assert island_perimeter(grid) == 16
