from solution import largest_magic_square


def test_largest_magic_square_example_one():
    grid = [[7, 1, 4, 5, 6], [2, 5, 1, 6, 4], [1, 5, 4, 3, 2], [1, 2, 7, 3, 4]]
    assert largest_magic_square(grid) == 3


def test_largest_magic_square_example_two():
    assert largest_magic_square([[5, 1, 3, 1], [9, 3, 3, 1], [1, 3, 3, 8]]) == 2


def test_largest_magic_square_single_cell():
    assert largest_magic_square([[1]]) == 1


def test_largest_magic_square_no_two_by_two():
    assert largest_magic_square([[1, 2], [3, 4]]) == 1


def test_largest_magic_square_whole_grid():
    assert largest_magic_square([[2, 7, 6], [9, 5, 1], [4, 3, 8]]) == 3


def test_largest_magic_square_rows_match_but_diagonal_fails():
    assert largest_magic_square([[1, 2], [2, 1]]) == 1
