from solution import largest_local


def test_largest_local_example_one():
    grid = [[9, 9, 8, 1], [5, 6, 2, 6], [8, 2, 6, 4], [6, 2, 2, 2]]
    assert largest_local(grid) == [[9, 9], [8, 6]]


def test_largest_local_center_peak():
    grid = [[1] * 5 for _ in range(5)]
    grid[2][2] = 2
    assert largest_local(grid) == [[2, 2, 2], [2, 2, 2], [2, 2, 2]]


def test_largest_local_three_by_three():
    assert largest_local([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [[9]]


def test_largest_local_corner_peak():
    grid = [[100, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 7]]
    assert largest_local(grid) == [[100, 1], [1, 7]]
