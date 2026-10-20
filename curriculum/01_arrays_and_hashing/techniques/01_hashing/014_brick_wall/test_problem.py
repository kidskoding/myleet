from solution import least_bricks


def test_least_bricks_normal():
    wall = [[1, 2, 2, 1], [3, 1, 2], [1, 3, 2], [2, 4], [3, 1, 2], [1, 3, 1, 1]]
    assert least_bricks(wall) == 2


def test_least_bricks_no_shared_edges():
    assert least_bricks([[1], [1], [1]]) == 3


def test_least_bricks_two_rows():
    assert least_bricks([[1, 1], [2]]) == 1


def test_least_bricks_every_row_aligned():
    """A seam every row shares, so the line crosses nothing."""
    assert least_bricks([[1, 1], [1, 1], [1, 1]]) == 0


def test_least_bricks_single_row():
    assert least_bricks([[1, 2, 3]]) == 0


def test_least_bricks_mirrored_rows():
    assert least_bricks([[2, 1], [1, 2]]) == 1
