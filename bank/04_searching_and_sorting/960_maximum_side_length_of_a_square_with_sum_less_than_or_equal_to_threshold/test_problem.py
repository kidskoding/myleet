from solution import max_side_length


def test_max_side_length_example_one():
    mat = [[1, 1, 3, 2, 4, 3, 2], [1, 1, 3, 2, 4, 3, 2], [1, 1, 3, 2, 4, 3, 2]]
    assert max_side_length(mat, 4) == 2


def test_max_side_length_none_fit():
    assert max_side_length([[2] * 5 for _ in range(5)], 1) == 0


def test_max_side_length_zero_threshold():
    assert max_side_length([[0, 1], [1, 1]], 0) == 1


def test_max_side_length_all_zeros():
    assert max_side_length([[0] * 3 for _ in range(3)], 0) == 3


def test_max_side_length_corner_block():
    mat = [[1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]
    assert max_side_length(mat, 6) == 3
