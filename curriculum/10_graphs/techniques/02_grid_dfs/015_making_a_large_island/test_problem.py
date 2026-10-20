from solution import largest_island


def test_largest_island_normal_case():
    grid = [[1, 0], [0, 1]]

    assert largest_island(grid) == 3


def test_largest_island_all_land():
    assert largest_island([[1, 1], [1, 1]]) == 4


def test_largest_island_all_water():
    assert largest_island([[0, 0], [0, 0]]) == 1
