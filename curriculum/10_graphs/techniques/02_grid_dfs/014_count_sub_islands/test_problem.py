from solution import count_sub_islands


def test_count_sub_islands_normal_case():
    grid1 = [
        [1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 0, 1, 1],
    ]
    grid2 = [
        [1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1],
        [0, 1, 0, 0, 0],
        [1, 0, 1, 1, 0],
        [0, 1, 0, 1, 0],
    ]

    assert count_sub_islands(grid1, grid2) == 3


def test_count_sub_islands_no_islands():
    assert count_sub_islands([[0, 0]], [[0, 0]]) == 0
