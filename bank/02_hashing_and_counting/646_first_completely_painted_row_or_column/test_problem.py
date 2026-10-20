from solution import first_complete_index


def test_first_complete_index_two_by_two():
    assert first_complete_index([1, 3, 4, 2], [[1, 4], [2, 3]]) == 2


def test_first_complete_index_three_by_three():
    assert first_complete_index([2, 8, 7, 4, 1, 3, 5, 6, 9], [[3, 2, 5], [1, 4, 6], [8, 7, 9]]) == 3


def test_first_complete_index_single_cell():
    assert first_complete_index([1], [[1]]) == 0


def test_first_complete_index_single_row_column_done_first():
    assert first_complete_index([2, 3, 1], [[3, 1, 2]]) == 0


def test_first_complete_index_last_paint():
    assert first_complete_index([1, 4, 2, 3], [[1, 2], [3, 4]]) == 2
