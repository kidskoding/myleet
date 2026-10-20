from solution import restore_matrix


def assert_valid(row_sum: list[int], col_sum: list[int]) -> None:
    matrix = restore_matrix(row_sum, col_sum)
    assert len(matrix) == len(row_sum)
    assert all(len(row) == len(col_sum) for row in matrix)
    assert all(value >= 0 for row in matrix for value in row)
    assert [sum(row) for row in matrix] == row_sum
    assert [sum(col) for col in zip(*matrix)] == col_sum


def test_restore_matrix_two_by_two():
    assert_valid([3, 8], [4, 7])


def test_restore_matrix_three_by_three():
    assert_valid([5, 7, 10], [8, 6, 8])


def test_restore_matrix_single_cell():
    assert_valid([4], [4])


def test_restore_matrix_zero_sums():
    assert_valid([0, 0], [0, 0, 0])


def test_restore_matrix_non_square():
    assert_valid([14, 9], [6, 9, 8])


def test_restore_matrix_large_values():
    assert_valid([10**8, 1], [1, 10**8])
