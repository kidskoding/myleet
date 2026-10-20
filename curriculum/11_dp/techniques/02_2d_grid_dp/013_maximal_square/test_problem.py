from solution import maximal_square


def test_maximal_square_empty():
    assert maximal_square([]) == 0


def test_maximal_square_no_square():
    assert maximal_square([["0", "0"], ["0", "0"]]) == 0


def test_maximal_square_normal():
    matrix = [
        ["1", "0", "1", "0", "0"],
        ["1", "0", "1", "1", "1"],
        ["1", "1", "1", "1", "1"],
        ["1", "0", "0", "1", "0"],
    ]
    assert maximal_square(matrix) == 4


def test_maximal_square_single_cell():
    assert maximal_square([["1"]]) == 1
