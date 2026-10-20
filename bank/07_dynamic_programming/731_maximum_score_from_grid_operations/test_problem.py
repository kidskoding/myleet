from solution import maximum_score


def test_maximum_score_example_sparse():
    grid = [[0, 0, 0, 0, 0], [0, 0, 3, 0, 0], [0, 1, 0, 0, 0], [5, 0, 0, 3, 0], [0, 0, 0, 0, 2]]
    assert maximum_score(grid) == 11


def test_maximum_score_example_dense():
    grid = [[10, 9, 0, 0, 15], [7, 1, 0, 8, 0], [5, 20, 0, 11, 0], [0, 0, 0, 1, 2], [8, 12, 1, 10, 3]]
    assert maximum_score(grid) == 94


def test_maximum_score_single_cell_has_no_neighbour():
    assert maximum_score([[5]]) == 0


def test_maximum_score_two_by_two():
    assert maximum_score([[1, 2], [3, 4]]) == 6


def test_maximum_score_all_zero():
    assert maximum_score([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) == 0
