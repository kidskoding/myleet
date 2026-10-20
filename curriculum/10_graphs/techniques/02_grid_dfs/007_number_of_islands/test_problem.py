from solution import num_islands


def test_num_islands_empty_grid():
    assert num_islands([]) == 0


def test_num_islands_single_island():
    grid = [
        ["1", "1", "0", "0"],
        ["1", "1", "0", "0"],
        ["0", "0", "1", "0"],
        ["0", "0", "0", "1"],
    ]

    assert num_islands(grid) == 3


def test_num_islands_no_land():
    assert num_islands([["0", "0"], ["0", "0"]]) == 0
