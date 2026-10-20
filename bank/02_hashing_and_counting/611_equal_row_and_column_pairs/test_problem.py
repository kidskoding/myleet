from solution import equal_pairs


def test_equal_pairs_one_match():
    assert equal_pairs([[3, 2, 1], [1, 7, 6], [2, 7, 7]]) == 1


def test_equal_pairs_duplicate_rows():
    assert equal_pairs([[3, 1, 2, 2], [1, 4, 4, 5], [2, 4, 2, 2], [2, 4, 2, 2]]) == 3


def test_equal_pairs_single_cell():
    assert equal_pairs([[5]]) == 1


def test_equal_pairs_all_same():
    assert equal_pairs([[1, 1], [1, 1]]) == 4


def test_equal_pairs_none():
    assert equal_pairs([[1, 2], [3, 4]]) == 0
