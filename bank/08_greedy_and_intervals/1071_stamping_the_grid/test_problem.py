from solution import possible_to_stamp


def test_possible_to_stamp_overlapping_stamps():
    grid = [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]
    assert possible_to_stamp(grid, 4, 3) is True


def test_possible_to_stamp_diagonal_blocks():
    grid = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    assert possible_to_stamp(grid, 2, 2) is False


def test_possible_to_stamp_no_empty_cells():
    assert possible_to_stamp([[1, 1], [1, 1]], 3, 3) is True


def test_possible_to_stamp_single_cell_fits():
    assert possible_to_stamp([[0]], 1, 1) is True


def test_possible_to_stamp_stamp_too_big():
    assert possible_to_stamp([[0]], 2, 2) is False


def test_possible_to_stamp_tall_stamps_cover_columns():
    assert possible_to_stamp([[0, 0], [0, 0]], 2, 1) is True


def test_possible_to_stamp_gap_narrower_than_stamp():
    assert possible_to_stamp([[0, 0, 1, 0, 0]], 1, 2) is True
