from solution import matrix_block_sum


def test_matrix_block_sum_radius_one():
    mat = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    assert matrix_block_sum(mat, 1) == [[12, 21, 16], [27, 45, 33], [24, 39, 28]]


def test_matrix_block_sum_radius_covers_everything():
    mat = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    assert matrix_block_sum(mat, 2) == [[45, 45, 45], [45, 45, 45], [45, 45, 45]]


def test_matrix_block_sum_single_cell():
    assert matrix_block_sum([[5]], 1) == [[5]]
