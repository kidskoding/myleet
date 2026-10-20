from solution import count_black_blocks


def test_count_black_blocks_corner_cell():
    assert count_black_blocks(3, 3, [[0, 0]]) == [3, 1, 0, 0, 0]


def test_count_black_blocks_three_cells():
    assert count_black_blocks(3, 3, [[0, 0], [1, 1], [0, 2]]) == [0, 2, 2, 0, 0]


def test_count_black_blocks_no_black_cells():
    assert count_black_blocks(2, 2, []) == [1, 0, 0, 0, 0]


def test_count_black_blocks_full_block():
    assert count_black_blocks(2, 2, [[0, 0], [0, 1], [1, 0], [1, 1]]) == [0, 0, 0, 0, 1]


def test_count_black_blocks_huge_empty_grid():
    assert count_black_blocks(100_000, 100_000, []) == [99_999 * 99_999, 0, 0, 0, 0]
