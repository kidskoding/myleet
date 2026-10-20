from solution import max_area_of_island


def test_max_area_of_island_normal_case():
    grid = [
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
    ]

    assert max_area_of_island(grid) == 5


def test_max_area_of_island_no_land():
    assert max_area_of_island([[0, 0], [0, 0]]) == 0
