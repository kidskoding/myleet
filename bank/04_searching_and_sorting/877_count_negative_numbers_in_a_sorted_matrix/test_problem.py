from solution import count_negatives


def test_count_negatives_example():
    grid = [[4, 3, 2, -1], [3, 2, 1, -1], [1, 1, -1, -2], [-1, -1, -2, -3]]
    assert count_negatives(grid) == 8


def test_count_negatives_none():
    assert count_negatives([[3, 2], [1, 0]]) == 0


def test_count_negatives_single_negative_cell():
    assert count_negatives([[-1]]) == 1


def test_count_negatives_single_row():
    assert count_negatives([[5, 1, -1, -2]]) == 2


def test_count_negatives_single_column():
    assert count_negatives([[3], [-1], [-2]]) == 2


def test_count_negatives_all_negative():
    assert count_negatives([[-1, -2], [-3, -4], [-5, -6]]) == 6
